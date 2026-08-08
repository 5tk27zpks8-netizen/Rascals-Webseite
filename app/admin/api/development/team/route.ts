import { bindings } from "../../../../lib/cms";
import { developmentNeedScore, ensurePositionDevelopmentSchema, getGroupSkills, matchesPositionGroup, POSITION_GROUPS } from "../../../../lib/position-development";
import { requireCmsPermission } from "../../../../lib/permissions";

type Row = Record<string, unknown>;
const avg=(v:number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
const r1=(v:number)=>Math.round(v*10)/10;

export async function GET(request:Request){
 const actor=await requireCmsPermission("performance");if(actor instanceof Response)return actor;
 await ensurePositionDevelopmentSchema();const{DB}=bindings();const url=new URL(request.url);
 const seasonsRes=await DB.prepare("SELECT id,year,name,is_current FROM seasons ORDER BY year DESC").all<Row>();
 const seasons=seasonsRes.results.map(r=>({id:String(r.id),year:Number(r.year),name:String(r.name??""),isCurrent:Number(r.is_current??0)===1}));
 const season=seasons.find(s=>s.id===url.searchParams.get("seasonId"))??seasons.find(s=>s.isCurrent)??seasons[0]??null;
 if(!season)return Response.json({error:"Keine Saison vorhanden."},{status:404});
 const rosterRes=await DB.prepare(`SELECT rm.player_id,rm.jersey_number,rm.primary_position,rm.secondary_position,rm.availability,rm.roster_status,p.first_name,p.last_name FROM roster_memberships rm JOIN players p ON p.id=rm.player_id WHERE rm.season_id=? AND rm.team_id='mens' AND rm.roster_status NOT IN ('left','alumni') AND p.active=1`).bind(season.id).all<Row>();
 const roster=rosterRes.results.map(r=>({id:String(r.player_id),jerseyNumber:r.jersey_number==null?null:Number(r.jersey_number),firstName:String(r.first_name??""),lastName:String(r.last_name??""),primaryPosition:String(r.primary_position??""),secondaryPosition:String(r.secondary_position??""),availability:String(r.availability??"full")}));
 const evalRes=await DB.prepare("SELECT * FROM player_skill_evaluations WHERE season_id=? ORDER BY evaluated_at DESC,created_at DESC").bind(season.id).all<Row>();
 const allEvals=evalRes.results.map(r=>({id:String(r.id),playerId:String(r.player_id),skillKey:String(r.skill_key),current:Number(r.current_rating??0),target:Number(r.target_rating??0),priority:Number(r.priority??2),confidence:Number(r.confidence??3),evaluatedAt:String(r.evaluated_at??"")}));
 const latest=new Map<string,(typeof allEvals)[number]>();const previous=new Map<string,(typeof allEvals)[number]>();for(const e of allEvals){const k=`${e.playerId}|${e.skillKey}`;if(!latest.has(k))latest.set(k,e);else if(!previous.has(k))previous.set(k,e)}
 const goalsRes=await DB.prepare("SELECT id,player_id,skill_key,title,status,due_date,updated_at FROM development_goals WHERE season_id=? ORDER BY updated_at DESC").bind(season.id).all<Row>();
 const today=new Date().toISOString().slice(0,10);
 const goals=goalsRes.results.map(r=>({id:String(r.id),playerId:String(r.player_id),skillKey:r.skill_key?String(r.skill_key):null,title:String(r.title??""),status:String(r.status??"open"),dueDate:r.due_date?String(r.due_date):null,updatedAt:String(r.updated_at??"")}));
 const groupRows=[] as Array<Record<string,unknown>>;const teamNeeds=[] as Array<Record<string,unknown>>;const playerNeeds=[] as Array<Record<string,unknown>>;
 for(const group of POSITION_GROUPS){
  const players=roster.filter(p=>matchesPositionGroup(group,p.primaryPosition,p.secondaryPosition));const skills=await getGroupSkills(group.key);const skillKeys=new Set(skills.map(s=>s.key));
  const groupEvalEntries=[...latest.values()].filter(e=>players.some(p=>p.id===e.playerId)&&skillKeys.has(e.skillKey));
  const coverage=players.length&&skills.length?Math.round(groupEvalEntries.length/(players.length*skills.length)*100):0;
  const currentIndex=groupEvalEntries.length?Math.round(avg(groupEvalEntries.map(e=>e.current))*20):null;
  const skillNeeds=skills.map(skill=>{const rows=players.map(p=>latest.get(`${p.id}|${skill.key}`)).filter((e):e is (typeof allEvals)[number]=>Boolean(e));const current=avg(rows.map(e=>e.current)),target=avg(rows.map(e=>e.target)),priority=avg(rows.map(e=>e.priority));const need=rows.length?developmentNeedScore(current,target,priority):0;const cov=players.length?Math.round(rows.length/players.length*100):0;const deltas=rows.map(e=>{const b=previous.get(`${e.playerId}|${e.skillKey}`);return b?e.current-b.current:null}).filter((v):v is number=>v!=null);return{group:group.key,groupLabel:group.label,unit:group.unit,key:skill.key,label:skill.label,category:skill.category,count:rows.length,current:r1(current),target:r1(target),needScore:need,coveragePct:cov,trend:deltas.length?r1(avg(deltas)):null,state:cov<40?"evaluate-first":need>=50?"focus":need>=25?"improve":"maintain"}}).filter(s=>s.count>0);
  teamNeeds.push(...skillNeeds);
  const needIndex=skillNeeds.length?Math.round(avg(skillNeeds.map(s=>s.needScore))):null;
  const trendVals=skillNeeds.map(s=>s.trend).filter((v):v is number=>v!=null);
  const groupGoals=goals.filter(g=>players.some(p=>p.id===g.playerId));
  groupRows.push({key:group.key,label:group.label,unit:group.unit,players:players.length,coveragePct:coverage,currentIndex,needIndex,focusSkills:skillNeeds.filter(s=>s.state==="focus").length,evaluateFirst:skillNeeds.filter(s=>s.state==="evaluate-first").length,trend:trendVals.length?r1(avg(trendVals)):null,openGoals:groupGoals.filter(g=>g.status!=="achieved").length});
  for(const player of players){const rows=skills.map(s=>latest.get(`${player.id}|${s.key}`)).filter((e):e is (typeof allEvals)[number]=>Boolean(e));if(!rows.length)continue;const needs=rows.map(e=>developmentNeedScore(e.current,e.target,e.priority));const deltas=rows.map(e=>{const b=previous.get(`${e.playerId}|${e.skillKey}`);return b?e.current-b.current:null}).filter((v):v is number=>v!=null);playerNeeds.push({group:group.key,groupLabel:group.label,playerId:player.id,jerseyNumber:player.jerseyNumber,name:`${player.firstName} ${player.lastName}`.trim(),position:player.primaryPosition,availability:player.availability,coveragePct:skills.length?Math.round(rows.length/skills.length*100):0,currentIndex:Math.round(avg(rows.map(e=>e.current))*20),needIndex:Math.round(avg(needs)),trend:deltas.length?r1(avg(deltas)):null,openGoals:goals.filter(g=>g.playerId===player.id&&g.status!=="achieved").length})}
 }
 teamNeeds.sort((a,b)=>Number(b.needScore)-Number(a.needScore));playerNeeds.sort((a,b)=>Number(b.needIndex)-Number(a.needIndex));
 const evaluated=[...latest.values()];const allSkillCount=(await Promise.all(POSITION_GROUPS.map(g=>getGroupSkills(g.key)))).reduce((sum,skills)=>sum+skills.length,0);
 const theoretical=POSITION_GROUPS.reduce((sum,g)=>{const count=roster.filter(p=>matchesPositionGroup(g,p.primaryPosition,p.secondaryPosition)).length;return sum+count},0);
 const overallCoverage=theoretical&&allSkillCount?Math.round(groupRows.reduce((s,g)=>s+Number(g.coveragePct)*Number(g.players),0)/Math.max(1,groupRows.reduce((s,g)=>s+Number(g.players),0))):0;
 return Response.json({current:actor,seasons,season,summary:{players:roster.length,coveragePct:overallCoverage,currentIndex:evaluated.length?Math.round(avg(evaluated.map(e=>e.current))*20):null,needIndex:teamNeeds.length?Math.round(avg(teamNeeds.map(n=>Number(n.needScore)))):null,focusSkills:teamNeeds.filter(n=>n.state==="focus").length,openGoals:goals.filter(g=>g.status!=="achieved").length,overdueGoals:goals.filter(g=>g.status!=="achieved"&&g.dueDate&&g.dueDate<today).length},groups:groupRows,topNeeds:teamNeeds.slice(0,12),playerWatchlist:playerNeeds.slice(0,15),goals:goals.filter(g=>g.status!=="achieved").slice(0,20)});
}
