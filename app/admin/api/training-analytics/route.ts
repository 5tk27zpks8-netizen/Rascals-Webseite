import { bindings } from "../../../lib/cms";
import { ensureTrainingOperationsSchema } from "../../../lib/training-operations";
import { ensurePerformanceSchema } from "../../../lib/performance";
import { ensurePositionDevelopmentSchema } from "../../../lib/position-development";
import { requireCmsPermission } from "../../../lib/permissions";

type Row=Record<string,unknown>;
const avg=(v:number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
const r1=(v:number)=>Math.round(v*10)/10;
const dateOf=(v:unknown)=>String(v??"");

export async function GET(request:Request){
 const actor=await requireCmsPermission("performance");if(actor instanceof Response)return actor;
 await ensureTrainingOperationsSchema();await ensurePerformanceSchema();await ensurePositionDevelopmentSchema();
 const{DB}=bindings();const url=new URL(request.url);
 const seasonsRes=await DB.prepare("SELECT id,year,name,is_current FROM seasons ORDER BY year DESC").all<Row>();
 const seasons=seasonsRes.results.map(r=>({id:String(r.id),year:Number(r.year),name:String(r.name??""),isCurrent:Number(r.is_current??0)===1}));
 const season=seasons.find(s=>s.id===url.searchParams.get("seasonId"))??seasons.find(s=>s.isCurrent)??seasons[0]??null;
 if(!season)return Response.json({error:"Keine Saison vorhanden."},{status:404});

 const sessionsRes=await DB.prepare(`SELECT s.*,r.completion_pct,r.execution_rating,r.intensity_rating,r.objective_met,r.reviewed_at
   FROM training_sessions s LEFT JOIN training_session_reviews r ON r.session_id=s.id
   WHERE s.season_id=? ORDER BY COALESCE(s.starts_at,s.created_at) ASC`).bind(season.id).all<Row>();
 const sessions=sessionsRes.results.map(r=>({id:String(r.id),title:String(r.title??"Training"),date:dateOf(r.starts_at??r.created_at),duration:Number(r.duration_minutes??0),status:String(r.status??"draft"),completion:r.completion_pct==null?null:Number(r.completion_pct),execution:r.execution_rating==null?null:Number(r.execution_rating),intensity:r.intensity_rating==null?null:Number(r.intensity_rating),objectiveMet:r.objective_met==null?null:Number(r.objective_met)===1}));
 const completed=sessions.filter(s=>s.status==="completed"),completedIds=completed.map(s=>s.id);

 let periods:Row[]=[];
 if(completedIds.length){const marks=completedIds.map(()=>"?").join(",");const p=await DB.prepare(`SELECT tp.*,COALESCE(ts.starts_at,ts.created_at) session_date FROM training_periods tp JOIN training_sessions ts ON ts.id=tp.session_id WHERE tp.session_id IN (${marks}) ORDER BY COALESCE(ts.starts_at,ts.created_at),tp.sort_order`).bind(...completedIds).all<Row>();periods=p.results}
 const totalCompletedMinutes=periods.reduce((s,p)=>s+Number(p.minutes??0),0);
 const dataDrivenMinutes=periods.filter(p=>String(p.source_type)==="development-need").reduce((s,p)=>s+Number(p.minutes??0),0);

 const bySkill=new Map<string,{skillKey:string;minutes:number;sessions:Set<string>;group:string;unit:string;firstDate:string;lastDate:string}>();
 const byGroup=new Map<string,{label:string;minutes:number;sessions:Set<string>}>();
 const byUnit=new Map<string,{label:string;minutes:number}>();
 for(const p of periods){const min=Number(p.minutes??0),group=String(p.position_group??"TEAM")||"TEAM",unit=String(p.unit??"team")||"team",key=String(p.source_key??""),sessionDate=dateOf(p.session_date);
   const g=byGroup.get(group)??{label:group,minutes:0,sessions:new Set<string>()};g.minutes+=min;g.sessions.add(String(p.session_id));byGroup.set(group,g);
   const u=byUnit.get(unit)??{label:unit,minutes:0};u.minutes+=min;byUnit.set(unit,u);
   if(String(p.source_type)==="development-need"&&key){const x=bySkill.get(key)??{skillKey:key,minutes:0,sessions:new Set<string>(),group,unit,firstDate:sessionDate,lastDate:sessionDate};x.minutes+=min;x.sessions.add(String(p.session_id));if(sessionDate&&(!x.firstDate||sessionDate<x.firstDate))x.firstDate=sessionDate;if(sessionDate&&(!x.lastDate||sessionDate>x.lastDate))x.lastDate=sessionDate;bySkill.set(key,x)}
 }

 const defs=await DB.prepare("SELECT skill_key,label,position_group,category FROM development_skill_definitions WHERE active=1").all<Row>();
 const defMap=new Map(defs.results.map(r=>[String(r.skill_key),{label:String(r.label??r.skill_key),group:String(r.position_group??""),category:String(r.category??"")} ]));
 const evals=await DB.prepare("SELECT player_id,skill_key,current_rating,evaluated_at,created_at FROM player_skill_evaluations WHERE season_id=? ORDER BY evaluated_at ASC,created_at ASC").bind(season.id).all<Row>();
 const evalBySkill=new Map<string,Row[]>();for(const e of evals.results){const k=String(e.skill_key),arr=evalBySkill.get(k)??[];arr.push(e);evalBySkill.set(k,arr)}
 const effectiveness=[...bySkill.values()].map(x=>{const rows=evalBySkill.get(x.skillKey)??[],byPlayer=new Map<string,Row[]>();for(const e of rows){const pid=String(e.player_id),arr=byPlayer.get(pid)??[];arr.push(e);byPlayer.set(pid,arr)}const deltas:number[]=[];for(const playerRows of byPlayer.values()){const baseline=playerRows.filter(e=>dateOf(e.evaluated_at??e.created_at)<=x.firstDate).at(-1);const followup=playerRows.filter(e=>dateOf(e.evaluated_at??e.created_at)>=x.lastDate).at(-1);if(!baseline||!followup)continue;const before=Number(baseline.current_rating??0),after=Number(followup.current_rating??0);if(before>0&&after>0)deltas.push(after-before)}const def=defMap.get(x.skillKey);return{skillKey:x.skillKey,skillLabel:def?.label??x.skillKey,group:def?.group||x.group,category:def?.category??"",minutes:x.minutes,sessions:x.sessions.size,evaluatedPlayers:deltas.length,skillDelta:deltas.length?r1(avg(deltas)):null,effectivenessPer60:deltas.length&&x.minutes>0?r1((avg(deltas)*60)/x.minutes):null,measurementWindow:{from:x.firstDate,to:x.lastDate}}}).sort((a,b)=>b.minutes-a.minutes);

 const attendanceRows=await DB.prepare(`SELECT pe.occurred_at,pe.attendance FROM player_performance_entries pe JOIN training_sessions ts ON ts.id=pe.context_id WHERE pe.context='training' AND ts.season_id=? ORDER BY pe.occurred_at`).bind(season.id).all<Row>();
 const monthMap=new Map<string,{month:string;sessions:number;minutes:number;present:number;totalAttendance:number;execution:number[];intensity:number[]}>();
 function monthKey(date:string){return date&&date.length>=7?date.slice(0,7):`${season.year}-00`}
 for(const s of completed){const m=monthKey(s.date),x=monthMap.get(m)??{month:m,sessions:0,minutes:0,present:0,totalAttendance:0,execution:[],intensity:[]};x.sessions++;if(s.execution!=null)x.execution.push(s.execution);if(s.intensity!=null)x.intensity.push(s.intensity);monthMap.set(m,x)}
 for(const p of periods){const m=monthKey(dateOf(p.session_date)),x=monthMap.get(m)??{month:m,sessions:0,minutes:0,present:0,totalAttendance:0,execution:[],intensity:[]};x.minutes+=Number(p.minutes??0);monthMap.set(m,x)}
 for(const a of attendanceRows.results){const m=monthKey(dateOf(a.occurred_at)),x=monthMap.get(m)??{month:m,sessions:0,minutes:0,present:0,totalAttendance:0,execution:[],intensity:[]},st=String(a.attendance??"none");if(["present","absent","excused","injured"].includes(st)){x.totalAttendance++;if(st==="present")x.present++}monthMap.set(m,x)}
 const monthly=[...monthMap.values()].sort((a,b)=>a.month.localeCompare(b.month)).map(x=>({month:x.month,sessions:x.sessions,minutes:x.minutes,attendancePct:x.totalAttendance?Math.round(x.present/x.totalAttendance*100):null,executionAvg:x.execution.length?r1(avg(x.execution)):null,intensityAvg:x.intensity.length?r1(avg(x.intensity)):null}));
 const reviewExecution=completed.map(s=>s.execution).filter((v):v is number=>v!=null),reviewIntensity=completed.map(s=>s.intensity).filter((v):v is number=>v!=null),completion=completed.map(s=>s.completion).filter((v):v is number=>v!=null);
 return Response.json({current:actor,seasons,season,summary:{sessionsPlanned:sessions.filter(s=>["planned","completed"].includes(s.status)).length,sessionsCompleted:completed.length,totalMinutes:totalCompletedMinutes,dataDrivenMinutes,dataDrivenSharePct:totalCompletedMinutes?Math.round(dataDrivenMinutes/totalCompletedMinutes*100):0,avgCompletionPct:completion.length?Math.round(avg(completion)):null,avgExecution:reviewExecution.length?r1(avg(reviewExecution)):null,avgIntensity:reviewIntensity.length?r1(avg(reviewIntensity)):null},monthly,byGroup:[...byGroup.values()].map(x=>({group:x.label,minutes:x.minutes,sessions:x.sessions.size})).sort((a,b)=>b.minutes-a.minutes),byUnit:[...byUnit.values()].sort((a,b)=>b.minutes-a.minutes),effectiveness});
}
