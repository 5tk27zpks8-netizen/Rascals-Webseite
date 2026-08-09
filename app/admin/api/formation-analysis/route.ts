import { bindings } from "../../../lib/cms";
import { ensurePerformanceSchema, mapPerformanceEntry, performanceIndex } from "../../../lib/performance";
import { ensurePositionDevelopmentSchema } from "../../../lib/position-development";
import { ensureRosterFoundation, getCurrentDepthEntries } from "../../../lib/roster";
import { requireCmsPermission } from "../../../lib/permissions";

type Row = Record<string, unknown>;
function avg(values:number[]){return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function round(value:number|null){return value==null?null:Math.round(value)}

export async function GET(request:Request){
  const actor=await requireCmsPermission("performance");
  if(actor instanceof Response)return actor;
  await ensureRosterFoundation();
  await ensurePerformanceSchema();
  await ensurePositionDevelopmentSchema();
  const {DB}=bindings();
  const url=new URL(request.url);
  const seasonId=url.searchParams.get("seasonId")??"";
  if(!seasonId)return Response.json({error:"seasonId fehlt."},{status:400});

  const roster=await DB.prepare(`SELECT rm.player_id,rm.jersey_number,rm.availability,rm.primary_position,rm.secondary_position,p.first_name,p.last_name
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND rm.roster_status NOT IN ('left','alumni') AND p.active=1`).bind(seasonId).all<Row>();
  const depth=await getCurrentDepthEntries(seasonId,"mens");
  const playerIds=roster.results.map(r=>String(r.player_id));
  const ratings:Array<Record<string,unknown>>=[];

  for(const playerId of playerIds){
    const perfRows=await DB.prepare(`SELECT pe.* FROM player_performance_entries pe WHERE pe.player_id=? AND (
      (pe.context='training' AND pe.context_id IS NOT NULL AND EXISTS(SELECT 1 FROM training_sessions ts WHERE ts.id=pe.context_id AND ts.season_id=?)) OR
      (pe.context='game' AND pe.context_id IS NOT NULL AND EXISTS(SELECT 1 FROM games g WHERE g.id=pe.context_id AND g.season_id=?)) OR
      pe.context='review'
    ) ORDER BY pe.occurred_at DESC LIMIT 20`).bind(playerId,seasonId,seasonId).all<Row>();
    const perf=perfRows.results.map(mapPerformanceEntry).map(performanceIndex).filter((v):v is number=>v!=null);
    const evalRows=await DB.prepare(`SELECT current_rating FROM player_skill_evaluations WHERE player_id=? AND season_id=? ORDER BY evaluated_at DESC,created_at DESC LIMIT 12`).bind(playerId,seasonId).all<Row>();
    const skills=evalRows.results.map(r=>Number(r.current_rating??0)).filter(v=>v>0).map(v=>v*20);
    const performanceRating=round(avg(perf));
    const skillRating=round(avg(skills));
    const composite=round(performanceRating!=null&&skillRating!=null?performanceRating*.6+skillRating*.4:performanceRating??skillRating);
    ratings.push({playerId,performanceRating,skillRating,compositeRating:composite,sampleSize:perf.length,skillSampleSize:skills.length});
  }

  const rosterById=new Map(roster.results.map(r=>[String(r.player_id),r]));
  return Response.json({current:actor,seasonId,players:ratings.map(r=>{const p=rosterById.get(String(r.playerId));const d=depth.filter(x=>x.playerId===r.playerId).sort((a,b)=>a.rank-b.rank);return {...r,firstName:String(p?.first_name??""),lastName:String(p?.last_name??""),jerseyNumber:p?.jersey_number==null?null:Number(p.jersey_number),availability:String(p?.availability??"full"),depth:d.map(x=>({position:x.position,positionGroup:x.positionGroup,rank:x.rank,snapshotId:x.snapshotId}))}})});
}
