import { bindings } from "../../../lib/cms";
import { ensurePerformanceSchema, mapPerformanceEntry, performanceIndex } from "../../../lib/performance";
import { ensurePositionDevelopmentSchema } from "../../../lib/position-development";
import { ensureRosterFoundation, getCurrentDepthEntries, getCurrentDepthSnapshot, isActiveRosterStatus } from "../../../lib/roster";
import { requireCmsPermission } from "../../../lib/permissions";

type Row = Record<string, unknown>;
const avg=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const round=(value:number|null)=>value==null?null:Math.round(value);

export async function GET(request:Request){
  const actor=await requireCmsPermission("performance");
  if(actor instanceof Response)return actor;
  await ensureRosterFoundation();
  await ensurePerformanceSchema();
  await ensurePositionDevelopmentSchema();
  const{DB}=bindings();
  const url=new URL(request.url);
  const seasonId=url.searchParams.get("seasonId")??"";
  if(!seasonId)return Response.json({error:"seasonId ist erforderlich."},{status:400});
  const season=await DB.prepare("SELECT id,year,name FROM seasons WHERE id=? LIMIT 1").bind(seasonId).first<Row>();
  if(!season)return Response.json({error:"Saison nicht gefunden."},{status:404});

  const roster=await DB.prepare(`SELECT rm.player_id,rm.jersey_number,rm.primary_position,rm.secondary_position,rm.unit,rm.roster_status,rm.availability,p.first_name,p.last_name
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND p.active=1
    ORDER BY rm.jersey_number,p.last_name`).bind(seasonId).all<Row>();
  const active=roster.results.filter(r=>isActiveRosterStatus(r.roster_status));
  const ratings=[] as Array<Record<string,unknown>>;

  for(const player of active){
    const playerId=String(player.player_id);
    const perfRows=await DB.prepare(`SELECT pe.* FROM player_performance_entries pe WHERE pe.player_id=? AND (
      (pe.context='training' AND pe.context_id IS NOT NULL AND EXISTS(SELECT 1 FROM training_sessions ts WHERE ts.id=pe.context_id AND ts.season_id=?)) OR
      (pe.context='game' AND pe.context_id IS NOT NULL AND EXISTS(SELECT 1 FROM games g WHERE g.id=pe.context_id AND g.season_id=?)) OR
      ((pe.context='review' OR pe.context_id IS NULL) AND substr(pe.occurred_at,1,4)=?)
    )`).bind(playerId,seasonId,seasonId,String(season.year)).all<Row>();
    const performanceValues=perfRows.results.map(mapPerformanceEntry).map(performanceIndex).filter((v):v is number=>v!=null);
    const performanceRating=round(avg(performanceValues));

    const evalRows=await DB.prepare(`SELECT e.skill_key,e.current_rating FROM player_skill_evaluations e
      JOIN (SELECT skill_key,MAX(evaluated_at) mx FROM player_skill_evaluations WHERE player_id=? AND season_id=? GROUP BY skill_key) latest
      ON latest.skill_key=e.skill_key AND latest.mx=e.evaluated_at
      WHERE e.player_id=? AND e.season_id=?`).bind(playerId,seasonId,playerId,seasonId).all<Row>();
    const skillValues=evalRows.results.map(r=>Number(r.current_rating)).filter(Number.isFinite).map(v=>v*20);
    const skillRating=round(avg(skillValues));
    const compositeRating=performanceRating!=null&&skillRating!=null?Math.round(performanceRating*.55+skillRating*.45):performanceRating??skillRating;

    ratings.push({
      playerId,firstName:String(player.first_name??""),lastName:String(player.last_name??""),jerseyNumber:player.jersey_number==null?null:Number(player.jersey_number),
      primaryPosition:String(player.primary_position??""),secondaryPosition:String(player.secondary_position??""),unit:String(player.unit??""),availability:String(player.availability??"full"),
      performanceRating,skillRating,compositeRating,performanceSamples:performanceValues.length,skillSamples:skillValues.length,
      dataCoverage:Math.round(((performanceValues.length?1:0)+(skillValues.length?1:0))/2*100)
    });
  }

  const depth=await getCurrentDepthEntries(seasonId,"mens");
  const snapshot=await getCurrentDepthSnapshot(seasonId,"mens");
  return Response.json({current:actor,season:{id:String(season.id),year:Number(season.year),name:String(season.name??"")},depthChartSnapshot:snapshot?{id:snapshot.id,label:snapshot.label}:null,depthChart:depth.map(d=>({position:d.position,positionGroup:d.positionGroup,rank:d.rank,playerId:d.playerId})),ratings});
}
