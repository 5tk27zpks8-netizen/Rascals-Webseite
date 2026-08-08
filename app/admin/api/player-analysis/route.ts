import { bindings } from "../../../lib/cms";
import { ensurePerformanceSchema, mapPerformanceEntry, performanceIndex } from "../../../lib/performance";
import { ensurePositionDevelopmentSchema, getPositionGroup, matchesPositionGroup } from "../../../lib/position-development";
import { ensureRosterFoundation } from "../../../lib/roster";
import { ensureStatsSchema } from "../../../lib/stats";
import { requireCmsPermission } from "../../../lib/permissions";

type Row = Record<string, unknown>;

function avg(values: number[]) { return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0; }
function round1(value:number){ return Math.round(value*10)/10; }

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  await ensurePerformanceSchema();
  await ensureStatsSchema();
  await ensurePositionDevelopmentSchema();
  const { DB } = bindings();
  const url = new URL(request.url);

  const seasonsResult = await DB.prepare("SELECT id,year,name,is_current,status FROM seasons ORDER BY year DESC").all<Row>();
  const seasons = seasonsResult.results.map(r=>({id:String(r.id),year:Number(r.year),name:String(r.name??""),isCurrent:Number(r.is_current??0)===1,status:String(r.status??"")}));
  const season = seasons.find(s=>s.id===url.searchParams.get("seasonId")) ?? seasons.find(s=>s.isCurrent) ?? seasons[0] ?? null;
  if(!season) return Response.json({error:"Keine Saison vorhanden."},{status:404});

  const roster = await DB.prepare(`SELECT rm.*,p.first_name,p.last_name,p.nickname,p.portrait,p.height_cm,p.weight_kg,p.birth_date,p.joined_year,p.bio
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND rm.roster_status NOT IN ('left','alumni') AND p.active=1
    ORDER BY rm.jersey_number,p.last_name,p.first_name`).bind(season.id).all<Row>();
  const players = roster.results.map(r=>({
    id:String(r.player_id),firstName:String(r.first_name??""),lastName:String(r.last_name??""),nickname:String(r.nickname??""),portrait:String(r.portrait??""),
    jerseyNumber:r.jersey_number==null?null:Number(r.jersey_number),primaryPosition:String(r.primary_position??""),secondaryPosition:String(r.secondary_position??""),unit:String(r.unit??""),
    rosterStatus:String(r.roster_status??"active"),availability:String(r.availability??"full"),starter:Number(r.starter??0)===1,captain:Number(r.captain??0)===1,rookie:Number(r.rookie??0)===1,
    leadershipRole:String(r.leadership_role??""),heightCm:r.height_cm==null?null:Number(r.height_cm),weightKg:r.weight_kg==null?null:Number(r.weight_kg),birthDate:r.birth_date?String(r.birth_date):null,joinedYear:r.joined_year==null?null:Number(r.joined_year),bio:String(r.bio??"")
  }));
  const selected = players.find(p=>p.id===url.searchParams.get("playerId")) ?? players[0] ?? null;
  if(!selected) return Response.json({current:actor,seasons,season,players,player:null});

  const performanceRows = await DB.prepare("SELECT * FROM player_performance_entries WHERE player_id=? AND substr(occurred_at,1,4)=? ORDER BY occurred_at DESC,created_at DESC")
    .bind(selected.id,String(season.year)).all<Row>();
  const performance = performanceRows.results.map(mapPerformanceEntry);
  const ratedPerformance = performance.map(e=>({...e,index:performanceIndex(e)}));
  const indices = ratedPerformance.map(e=>e.index).filter((v):v is number=>v!=null);
  const training = ratedPerformance.filter(e=>e.context==="training");
  const attendanceKnown = training.filter(e=>["present","absent","excused","injured"].includes(e.attendance));
  const attendancePresent = attendanceKnown.filter(e=>e.attendance==="present").length;

  const statsRows = await DB.prepare(`SELECT pgs.stat_key,sd.label,sd.short_label,sd.category,SUM(pgs.stat_value) total
    FROM player_game_stats pgs LEFT JOIN stat_definitions sd ON sd.stat_key=pgs.stat_key
    WHERE pgs.player_id=? AND pgs.season_id=? AND pgs.status='official'
    GROUP BY pgs.stat_key,sd.label,sd.short_label,sd.category ORDER BY sd.category,sd.sort_order,pgs.stat_key`).bind(selected.id,season.id).all<Row>();
  const stats = statsRows.results.map(r=>({key:String(r.stat_key),label:String(r.label??r.stat_key),shortLabel:String(r.short_label??r.stat_key),category:String(r.category??""),value:Number(r.total??0)}));

  const careerRows = await DB.prepare(`SELECT COALESCE(s.year,pgs.season) year,pgs.stat_key,sd.short_label,sd.label,SUM(pgs.stat_value) total
    FROM player_game_stats pgs LEFT JOIN seasons s ON s.id=pgs.season_id LEFT JOIN stat_definitions sd ON sd.stat_key=pgs.stat_key
    WHERE pgs.player_id=? AND pgs.status='official'
    GROUP BY COALESCE(s.year,pgs.season),pgs.stat_key,sd.short_label,sd.label ORDER BY year DESC,sd.sort_order,pgs.stat_key`).bind(selected.id).all<Row>();
  const careerByYear = new Map<number,Array<Record<string,unknown>>>();
  for(const r of careerRows.results){const year=Number(r.year);if(!careerByYear.has(year))careerByYear.set(year,[]);careerByYear.get(year)!.push({key:String(r.stat_key),shortLabel:String(r.short_label??r.stat_key),label:String(r.label??r.stat_key),value:Number(r.total??0)});}
  const career = [...careerByYear.entries()].map(([year,items])=>({year,items})).sort((a,b)=>b.year-a.year);

  const group = getPositionGroup(selected.primaryPosition || selected.secondaryPosition || "LB");
  const skillDefs = await DB.prepare("SELECT skill_key,label,category,description,sort_order FROM development_skill_definitions WHERE position_group=? AND active=1 ORDER BY sort_order,skill_key").bind(group.key).all<Row>();
  const skillKeys = new Set(skillDefs.results.map(r=>String(r.skill_key)));
  const evaluationRows = await DB.prepare("SELECT * FROM player_skill_evaluations WHERE player_id=? AND season_id=? ORDER BY evaluated_at DESC,created_at DESC")
    .bind(selected.id,season.id).all<Row>();
  const evaluations = evaluationRows.results.filter(r=>skillKeys.has(String(r.skill_key))).map(r=>({id:String(r.id),skillKey:String(r.skill_key),current:Number(r.current_rating??0),target:Number(r.target_rating??0),priority:Number(r.priority??2),confidence:Number(r.confidence??3),note:String(r.note??""),evaluatedAt:String(r.evaluated_at??""),evaluatedBy:String(r.evaluated_by??"")}));
  const latest = new Map<string,typeof evaluations[number]>(); const previous = new Map<string,typeof evaluations[number]>();
  for(const e of evaluations){if(!latest.has(e.skillKey))latest.set(e.skillKey,e);else if(!previous.has(e.skillKey))previous.set(e.skillKey,e);}
  const skills = skillDefs.results.map(r=>{const key=String(r.skill_key),cur=latest.get(key),prev=previous.get(key);return {key,label:String(r.label??key),category:String(r.category??""),description:String(r.description??""),current:cur?.current??null,target:cur?.target??null,priority:cur?.priority??null,confidence:cur?.confidence??null,note:cur?.note??"",evaluatedAt:cur?.evaluatedAt??null,evaluatedBy:cur?.evaluatedBy??"",delta:cur&&prev?round1(cur.current-prev.current):null};});
  const ratedSkills = skills.filter(s=>s.current!=null);
  const needValues = ratedSkills.map(s=>{const gap=Math.max(0,Number(s.target)-Number(s.current));return Math.round((gap/4)*(Math.max(1,Math.min(3,Number(s.priority)))/3)*100);});

  const goalsRows = await DB.prepare("SELECT * FROM development_goals WHERE player_id=? AND season_id=? ORDER BY CASE status WHEN 'in-progress' THEN 0 WHEN 'open' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,COALESCE(due_date,'9999-12-31'),updated_at DESC")
    .bind(selected.id,season.id).all<Row>();
  const goals = goalsRows.results.filter(r=>!r.skill_key||skillKeys.has(String(r.skill_key))).map(r=>({id:String(r.id),skillKey:r.skill_key?String(r.skill_key):null,title:String(r.title??""),targetRating:r.target_rating==null?null:Number(r.target_rating),dueDate:r.due_date?String(r.due_date):null,status:String(r.status??"open"),note:String(r.note??""),updatedAt:String(r.updated_at??"")}));

  const gameRows = await DB.prepare(`SELECT g.id,g.opponent,g.kickoff,g.status,g.rascals_score,g.opponent_score,COUNT(DISTINCT pgs.id) stat_rows
    FROM games g LEFT JOIN player_game_stats pgs ON pgs.game_id=g.id AND pgs.player_id=? AND pgs.status='official'
    WHERE g.season_id=? GROUP BY g.id ORDER BY g.kickoff DESC`).bind(selected.id,season.id).all<Row>();
  const games = gameRows.results.map(r=>({id:String(r.id),opponent:String(r.opponent??""),kickoff:r.kickoff?String(r.kickoff):null,status:String(r.status??""),rascalsScore:Number(r.rascals_score??0),opponentScore:Number(r.opponent_score??0),hasOfficialStats:Number(r.stat_rows??0)>0}));

  const skillTrend = evaluations.slice().reverse().map(e=>({date:e.evaluatedAt,skillKey:e.skillKey,value:e.current}));
  const perfTrend = ratedPerformance.filter(e=>e.index!=null).slice(0,12).reverse().map(e=>({date:e.occurredAt,value:e.index,context:e.context}));

  return Response.json({
    current:actor,seasons,season,players,player:selected,positionGroup:group,
    summary:{performanceIndex:indices.length?Math.round(avg(indices)):null,attendancePct:attendanceKnown.length?Math.round(attendancePresent/attendanceKnown.length*100):null,currentSkillIndex:ratedSkills.length?Math.round(avg(ratedSkills.map(s=>Number(s.current)))*20):null,developmentNeedIndex:needValues.length?Math.round(avg(needValues)):null,evaluationCoveragePct:skills.length?Math.round(ratedSkills.length/skills.length*100):0,openGoals:goals.filter(g=>g.status!=="achieved").length,officialStatCategories:new Set(stats.map(s=>s.category)).size,gamesWithStats:games.filter(g=>g.hasOfficialStats).length},
    performance:ratedPerformance.slice(0,40),stats,career,skills,goals,games,skillTrend,perfTrend
  });
}
