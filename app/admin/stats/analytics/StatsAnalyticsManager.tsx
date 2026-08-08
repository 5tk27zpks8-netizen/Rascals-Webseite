"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../../_components/AdminShell";
import "./analytics.css";

type Category = "all" | "offense" | "defense" | "special-teams";
type Season = { id:string; year:number; name:string; isCurrent:boolean };
type Game = { id:string; opponent:string; opponentLogo:string; kickoff:string|null; status:string; rascalsScore:number; opponentScore:number };
type Player = { id:string; jerseyNumber:number|null; position:string; firstName:string; lastName:string };
type Definition = { key:string; label:string; shortLabel:string; category:"offense"|"defense"|"special-teams"; valueType:string; positions:string[] };
type Derived = { key:string; label:string; shortLabel:string; category:"offense"|"defense"|"special-teams"; value:number; valueType:"percentage"|"average" };
type PlayerAggregate = { playerId:string; firstName:string; lastName:string; jerseyNumber:number|null; position:string; totals:Record<string,number>; derived:Derived[] };
type TeamAggregate = { totals:Record<string,number>; derived:Derived[] };
type Payload = {
  officialOnly:boolean;
  selectedSeason:Season;
  seasons:Season[];
  games:Game[];
  selectedGameId:string;
  players:Player[];
  selectedPlayerId:string;
  definitions:Definition[];
  boxScore:null|{ game:Game; statusCounts:{provisional:number;reviewed:number;official:number}; players:PlayerAggregate[]; team:TeamAggregate };
  seasonAggregate:{ players:PlayerAggregate[]; team:TeamAggregate };
  playerAnalytics:null|{
    player:Player;
    season:{ totals:Record<string,number>; derived:Derived[] };
    career:{ totals:Record<string,number>; derived:Derived[]; bySeason:Array<{seasonId:string|null;season:number;totals:Record<string,number>;derived:Derived[]}> };
  };
};

export function StatsAnalyticsManager(){
  const[data,setData]=useState<Payload|null>(null);
  const[seasonId,setSeasonId]=useState("");
  const[gameId,setGameId]=useState("");
  const[playerId,setPlayerId]=useState("");
  const[category,setCategory]=useState<Category>("all");
  const[notice,setNotice]=useState("");
  const[loading,setLoading]=useState(true);

  useEffect(()=>{void boot()},[]);

  async function boot(){
    const params=new URLSearchParams(window.location.search);
    const rawCategory=params.get("category")||"all";
    const initialCategory:Category=["offense","defense","special-teams"].includes(rawCategory)?rawCategory as Category:"all";
    setCategory(initialCategory);
    await load(params.get("season")||undefined,params.get("game")||undefined,params.get("player")||undefined,initialCategory);
  }

  async function load(nextSeason?:string,nextGame?:string,nextPlayer?:string,nextCategory:Category=category){
    setLoading(true);setNotice("");
    try{
      const params=new URLSearchParams();
      if(nextSeason)params.set("seasonId",nextSeason);
      if(nextGame)params.set("gameId",nextGame);
      if(nextPlayer)params.set("playerId",nextPlayer);
      if(nextCategory!=="all")params.set("category",nextCategory);
      const response=await fetch(`/admin/api/stats-analytics?${params.toString()}`);
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Stats Analytics konnten nicht geladen werden.")}
      const body=await response.json() as Payload;
      setData(body);setSeasonId(body.selectedSeason.id);setGameId(body.selectedGameId);setPlayerId(body.selectedPlayerId);
    }catch(error){setNotice(error instanceof Error?error.message:"Fehler beim Laden.")}finally{setLoading(false)}
  }

  function updateUrl(nextSeason=seasonId,nextGame=gameId,nextPlayer=playerId,nextCategory=category){
    const params=new URLSearchParams();
    if(nextSeason)params.set("season",nextSeason);
    if(nextGame)params.set("game",nextGame);
    if(nextPlayer)params.set("player",nextPlayer);
    if(nextCategory!=="all")params.set("category",nextCategory);
    window.history.replaceState(null,"",`/admin/stats/analytics?${params.toString()}`);
  }

  async function changeSeason(id:string){setSeasonId(id);setGameId("");updateUrl(id,"",playerId,category);await load(id,undefined,playerId,category)}
  async function changeGame(id:string){setGameId(id);updateUrl(seasonId,id,playerId,category);await load(seasonId,id,playerId,category)}
  async function changePlayer(id:string){setPlayerId(id);updateUrl(seasonId,gameId,id,category);await load(seasonId,gameId,id,category)}
  async function changeCategory(value:Category){setCategory(value);updateUrl(seasonId,gameId,playerId,value);await load(seasonId,gameId,playerId,value)}

  const reviewOpen=(data?.boxScore?.statusCounts.provisional??0)+(data?.boxScore?.statusCounts.reviewed??0);
  const seasonPlayers=data?.seasonAggregate.players??[];
  const leaders=useMemo(()=>buildLeaders(seasonPlayers,data?.definitions??[]),[seasonPlayers,data?.definitions]);

  return <AdminShell active="stats" title="Stats Analytics" eyebrow="RASCALS OS · OFFICIAL FOOTBALL ANALYTICS" actions={<><a className="cms-button secondary" href="/admin/stats">Stats Review</a><a className="cms-button secondary" href="/admin/performance">Performance</a></>}>
    {notice&&<AdminNotice tone="error">{notice}</AdminNotice>}
    <AdminNotice tone="info">Diese Analyse verwendet ausschließlich <b>OFFICIAL</b> Stats. Provisional und Reviewed bleiben bewusst außerhalb von Season-, Career- und Performance-Auswertungen.</AdminNotice>

    <AdminCard className="sa-filter-card">
      <div className="sa-filter-grid">
        <label className="cms-field"><span>Saison</span><select value={seasonId} disabled={loading} onChange={e=>void changeSeason(e.target.value)}>{data?.seasons.map(season=><option key={season.id} value={season.id}>{season.name}{season.isCurrent?" · AKTUELL":""}</option>)}</select></label>
        <label className="cms-field"><span>Game Box Score</span><select value={gameId} disabled={loading} onChange={e=>void changeGame(e.target.value)}><option value="">Kein Spiel</option>{data?.games.map(game=><option key={game.id} value={game.id}>{formatDate(game.kickoff)} · vs. {game.opponent}</option>)}</select></label>
        <label className="cms-field"><span>Spieler</span><select value={playerId} disabled={loading} onChange={e=>void changePlayer(e.target.value)}>{data?.players.map(player=><option key={player.id} value={player.id}>#{player.jerseyNumber??"–"} {player.firstName} {player.lastName} · {player.position||"–"}</option>)}</select></label>
        <label className="cms-field"><span>Unit</span><select value={category} disabled={loading} onChange={e=>void changeCategory(e.target.value as Category)}><option value="all">Alle Units</option><option value="offense">Offense</option><option value="defense">Defense</option><option value="special-teams">Special Teams</option></select></label>
      </div>
    </AdminCard>

    {data?.boxScore&&<AdminCard className="sa-box-card">
      <div className="sa-box-head">
        <div className="sa-matchup"><img src="/rascals-logo-transparent-4k.png" alt=""/><span><small>{formatDate(data.boxScore.game.kickoff)}</small><h2>RASCALS <i>VS</i> {data.boxScore.game.opponent}</h2><b>{data.boxScore.game.rascalsScore} : {data.boxScore.game.opponentScore}</b></span>{data.boxScore.game.opponentLogo?<img src={data.boxScore.game.opponentLogo} alt=""/>:<div className="sa-logo-placeholder">?</div>}</div>
        <div className="sa-review-state"><span><small>PROVISIONAL</small><b>{data.boxScore.statusCounts.provisional}</b></span><span><small>REVIEWED</small><b>{data.boxScore.statusCounts.reviewed}</b></span><span><small>OFFICIAL</small><b>{data.boxScore.statusCounts.official}</b></span></div>
      </div>
      {reviewOpen>0&&<AdminNotice tone="info">Für dieses Spiel sind noch {reviewOpen} Stat-Einträge nicht official. Der Box Score zeigt sie bewusst noch nicht an. <a href={`/admin/stats?season=${encodeURIComponent(seasonId)}&game=${encodeURIComponent(data.boxScore.game.id)}`}>Zum Stats Review →</a></AdminNotice>}
      <div className="cms-section-head"><div><small>GAME BOX SCORE</small><h2>Official Player Stats</h2></div><span className="cms-muted">{data.boxScore.players.length} Spieler mit Official Stats</span></div>
      <AggregateTable players={data.boxScore.players} definitions={data.definitions} />
      <AggregateSummary title="Team Game Totals" aggregate={data.boxScore.team} definitions={data.definitions}/>
    </AdminCard>}

    <div className="sa-two-col">
      <AdminCard>
        <div className="cms-section-head"><div><small>SEASON AGGREGATION</small><h2>{data?.selectedSeason.name??"Saison"} · Team Output</h2></div></div>
        <AggregateSummary title="Official Season Totals" aggregate={data?.seasonAggregate.team??{totals:{},derived:[]}} definitions={data?.definitions??[]}/>
      </AdminCard>
      <AdminCard>
        <div className="cms-section-head"><div><small>SEASON LEADERS</small><h2>Official Leaders</h2></div></div>
        <div className="sa-leaders">{leaders.slice(0,12).map(leader=><article key={leader.key}><span><small>{leader.shortLabel}</small><b>#{leader.jerseyNumber??"–"} {leader.firstName} {leader.lastName}</b></span><strong>{formatValue(leader.value,leader.valueType)}</strong></article>)}{!leaders.length&&<p className="cms-muted">Noch keine Official Season Stats vorhanden.</p>}</div>
      </AdminCard>
    </div>

    {data?.playerAnalytics&&<AdminCard className="sa-player-card">
      <div className="cms-section-head"><div><small>PLAYER AGGREGATION</small><h2>#{data.playerAnalytics.player.jerseyNumber??"–"} {data.playerAnalytics.player.firstName} {data.playerAnalytics.player.lastName}</h2><p className="cms-muted">{data.playerAnalytics.player.position||"–"} · Season vs. Career</p></div></div>
      <div className="sa-player-grid">
        <section><h3>{data.selectedSeason.name}</h3><AggregateSummary title="Season" aggregate={data.playerAnalytics.season} definitions={data.definitions}/></section>
        <section><h3>Career</h3><AggregateSummary title="Career" aggregate={data.playerAnalytics.career} definitions={data.definitions}/></section>
      </div>
      <CareerHistory rows={data.playerAnalytics.career.bySeason} definitions={data.definitions}/>
    </AdminCard>}
  </AdminShell>
}

function AggregateTable({players,definitions}:{players:PlayerAggregate[];definitions:Definition[]}){
  const columns=tableColumns(players,definitions);
  if(!players.length)return <div className="stats-empty">Noch keine Official Stats für diesen Box Score.</div>;
  return <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>Spieler</th>{columns.map(column=><th key={column.key} title={column.label}>{column.shortLabel}</th>)}</tr></thead><tbody>{players.map(player=><tr key={player.playerId}><td><b>#{player.jerseyNumber??"–"} {player.firstName} {player.lastName}</b><small>{player.position||"–"}</small></td>{columns.map(column=><td key={column.key}>{metricValue(player,column.key,column.valueType)}</td>)}</tr>)}</tbody></table></div>
}

function AggregateSummary({title,aggregate,definitions}:{title:string;aggregate:{totals:Record<string,number>;derived:Derived[]};definitions:Definition[]}){
  const base=definitions.filter(def=>aggregate.totals[def.key]!=null&&aggregate.totals[def.key]!==0).slice(0,14).map(def=>({key:def.key,label:def.label,shortLabel:def.shortLabel,value:aggregate.totals[def.key],valueType:def.valueType}));
  const derived=aggregate.derived.slice(0,8).map(metric=>({key:metric.key,label:metric.label,shortLabel:metric.shortLabel,value:metric.value,valueType:metric.valueType}));
  const values=[...base,...derived];
  return <div className="sa-summary"><small>{title}</small><div>{values.map(item=><span key={item.key}><b>{formatValue(item.value,item.valueType)}</b><em>{item.shortLabel}</em></span>)}{!values.length&&<p className="cms-muted">Noch keine Official Stats vorhanden.</p>}</div></div>
}

function CareerHistory({rows,definitions}:{rows:Array<{seasonId:string|null;season:number;totals:Record<string,number>;derived:Derived[]}>;definitions:Definition[]}){
  const columns=careerColumns(rows,definitions);
  if(!rows.length)return <div className="sa-career-history"><h3>Career by Season</h3><p className="cms-muted">Noch keine Official Career Stats vorhanden.</p></div>;
  return <div className="sa-career-history"><h3>Career by Season</h3><table><thead><tr><th>Saison</th>{columns.map(column=><th key={column.key}>{column.shortLabel}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={`${row.seasonId??"legacy"}-${row.season}`}><td><b>{row.season||"–"}</b></td>{columns.map(column=><td key={column.key}>{metricValue(row,column.key,column.valueType)}</td>)}</tr>)}</tbody></table></div>
}

type Column={key:string;label:string;shortLabel:string;valueType:string};
function tableColumns(players:PlayerAggregate[],definitions:Definition[]):Column[]{
  const base=definitions.filter(def=>players.some(player=>player.totals[def.key]!=null)).map(def=>({key:def.key,label:def.label,shortLabel:def.shortLabel,valueType:def.valueType}));
  const derivedMap=new Map<string,Column>();for(const player of players)for(const metric of player.derived)derivedMap.set(metric.key,{key:metric.key,label:metric.label,shortLabel:metric.shortLabel,valueType:metric.valueType});
  return [...base,...derivedMap.values()].slice(0,16);
}
function careerColumns(seasons:Array<{totals:Record<string,number>;derived:Derived[]}>,definitions:Definition[]):Column[]{
  const pseudo:PlayerAggregate[]=seasons.map((season,index)=>({playerId:String(index),firstName:"",lastName:"",jerseyNumber:null,position:"",totals:season.totals,derived:season.derived}));
  return tableColumns(pseudo,definitions).slice(0,12);
}
function metricValue(aggregate:{totals:Record<string,number>;derived:Derived[]},key:string,valueType:string){const derived=aggregate.derived.find(metric=>metric.key===key);const value=derived?.value??aggregate.totals[key];return value==null?"–":formatValue(value,derived?.valueType??valueType)}
function formatValue(value:number,valueType:string){if(valueType==="percentage")return `${value.toFixed(1)}%`;if(valueType==="average")return value.toFixed(1);return Number.isInteger(value)?String(value):value.toFixed(1)}
function formatDate(value:string|null){if(!value)return"ohne Datum";const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(date)}
function buildLeaders(players:PlayerAggregate[],definitions:Definition[]){const rows:Array<{key:string;shortLabel:string;firstName:string;lastName:string;jerseyNumber:number|null;value:number;valueType:string}>=[];for(const definition of definitions){let best:PlayerAggregate|null=null;let value=-Infinity;for(const player of players){const current=player.totals[definition.key];if(current!=null&&current>value){best=player;value=current}}if(best&&Number.isFinite(value))rows.push({key:definition.key,shortLabel:definition.shortLabel,firstName:best.firstName,lastName:best.lastName,jerseyNumber:best.jerseyNumber,value,valueType:definition.valueType})}const derivedKeys=new Map<string,Derived>();for(const player of players)for(const metric of player.derived)if(!derivedKeys.has(metric.key))derivedKeys.set(metric.key,metric);for(const template of derivedKeys.values()){let best:PlayerAggregate|null=null;let value=-Infinity;for(const player of players){const metric=player.derived.find(item=>item.key===template.key);if(metric&&metric.value>value){best=player;value=metric.value}}if(best)rows.push({key:template.key,shortLabel:template.shortLabel,firstName:best.firstName,lastName:best.lastName,jerseyNumber:best.jerseyNumber,value,valueType:template.valueType})}return rows.sort((a,b)=>b.value-a.value)}
