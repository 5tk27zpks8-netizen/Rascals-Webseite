import { bindings } from "../../../lib/cms";
import { ensureStatsSchema } from "../../../lib/stats";
import { requireCmsPermission } from "../../../lib/permissions";

type Row=Record<string,unknown>;
type Unit="offense"|"defense"|"special-teams";
type Card={label:string;value:number|null;suffix?:string;detail:string};
const round=(v:number,d=1)=>Math.round(v*10**d)/10**d;

export async function GET(request:Request){
 const actor=await requireCmsPermission("performance");if(actor instanceof Response)return actor;
 await ensureStatsSchema();const{DB}=bindings();const url=new URL(request.url),seasonId=url.searchParams.get("seasonId")??"",raw=url.searchParams.get("unit")??"offense",unit:Unit=raw==="defense"||raw==="special-teams"?raw:"offense";
 if(!seasonId)return Response.json({error:"seasonId fehlt."},{status:400});
 const games=await DB.prepare("SELECT id,rascals_score,opponent_score FROM games WHERE season_id=? AND status='final'").bind(seasonId).all<Row>(),gameCount=games.results.length;
 const totalsRes=await DB.prepare("SELECT stat_key,SUM(stat_value) total FROM player_game_stats WHERE season_id=? AND status='official' GROUP BY stat_key").bind(seasonId).all<Row>();
 const totals=new Map(totalsRes.results.map(r=>[String(r.stat_key),Number(r.total??0)]));const total=(...keys:string[])=>keys.reduce((s,k)=>s+(totals.get(k)??0),0),has=(...keys:string[])=>keys.some(k=>totals.has(k));
 const ppg=gameCount?round(games.results.reduce((s,g)=>s+Number(g.rascals_score??0),0)/gameCount):null,allowed=gameCount?round(games.results.reduce((s,g)=>s+Number(g.opponent_score??0),0)/gameCount):null;
 let cards:Card[]=[];
 if(unit==="offense"){
  const yards=has("passing_yards","rushing_yards")&&gameCount?round(total("passing_yards","rushing_yards")/gameCount):null;
  const firstDowns=has("first_downs")&&gameCount?round(total("first_downs")/gameCount):null;
  const rzAttempts=total("red_zone_attempts"),rzTd=total("red_zone_td","red_zone_touchdowns"),redZone=rzAttempts>0?round(rzTd/rzAttempts*100):null;
  const takeaways=total("interceptions","fumble_recoveries"),giveaways=total("interceptions_thrown","fumbles_lost"),turnover=has("interceptions","fumble_recoveries","interceptions_thrown","fumbles_lost")?round(takeaways-giveaways):null;
  cards=[{label:"Points per Game",value:ppg,detail:`${gameCount} Final Games`},{label:"Yards per Game",value:yards,detail:"Passing + Rushing · Official"},{label:"First Downs per Game",value:firstDowns,detail:firstDowns==null?"Noch keine First-Down-Daten":"Official"},{label:"Red Zone (TD%)",value:redZone,suffix:"%",detail:redZone==null?"Red-Zone Attempts/TD noch nicht erfasst":"Official"},{label:"Turnover Margin",value:turnover,detail:"Tracked Takeaways − Giveaways"}];
 }else if(unit==="defense"){
  const yardsAllowed=has("opponent_yards")&&gameCount?round(total("opponent_yards")/gameCount):null,sacks=has("sacks")&&gameCount?round(total("sacks")/gameCount):null,thirdAttempts=total("third_down_attempts_allowed"),thirdStops=total("third_down_stops"),third=thirdAttempts>0?round(thirdStops/thirdAttempts*100):null,takeaways=total("interceptions","fumble_recoveries"),giveaways=total("interceptions_thrown","fumbles_lost"),margin=has("interceptions","fumble_recoveries","interceptions_thrown","fumbles_lost")?round(takeaways-giveaways):null;
  cards=[{label:"Points Allowed",value:allowed,detail:`${gameCount} Final Games`},{label:"Yards Allowed",value:yardsAllowed,detail:yardsAllowed==null?"Opponent Yards noch nicht erfasst":"Official"},{label:"Sacks per Game",value:sacks,detail:"Official Player Stats"},{label:"3rd Down Stop",value:third,suffix:"%",detail:third==null?"3rd-Down-Daten noch nicht erfasst":"Official"},{label:"Takeaway Margin",value:margin,detail:"Tracked Takeaways − Giveaways"}];
 }else{
  const fga=total("field_goals_attempted"),fgm=total("field_goals_made"),fg=fga>0?round(fgm/fga*100):null,punts=total("punts"),net=has("net_punt_yards")&&punts>0?round(total("net_punt_yards")/punts):null,returns=total("kick_returns","punt_returns"),returnAvg=returns>0?round(total("kick_return_yards","punt_return_yards")/returns):null,kickoffs=total("kickoffs"),touchback=kickoffs>0?round(total("touchbacks")/kickoffs*100):null;
  cards=[{label:"Field Goal",value:fg,suffix:"%",detail:"FG Made / Attempts"},{label:"Net Punt",value:net,detail:net==null?"Net-Punt-Yards noch nicht erfasst":"Official"},{label:"Return Average",value:returnAvg,detail:returnAvg==null?"Return Attempts noch nicht erfasst":"Official"},{label:"Touchback",value:touchback,suffix:"%",detail:touchback==null?"Kickoff/Touchback-Daten noch nicht erfasst":"Official"},{label:"Coverage Grade",value:null,detail:"Wird aus ST-Evaluationsmodell ergänzt"}];
 }
 return Response.json({seasonId,unit,gameCount,cards});
}
