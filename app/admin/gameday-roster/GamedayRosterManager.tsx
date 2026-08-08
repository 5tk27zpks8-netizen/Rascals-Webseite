"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./gameday-roster.css";

type GameBase = {
  id:string; opponent:string; opponentLogo:string; kickoff:string|null; status:string; seasonId:string; seasonYear:number|null; seasonName:string; rosterStatus:string;
};
type Control = { gameId:string; seasonId:string; teamId:string; status:"draft"|"locked"; sourceDepthSnapshotId:string|null; lockedBy:string; lockedAt:string|null; updatedBy:string; updatedAt:string };
type DepthSnapshot = { id:string; label:string; createdAt:string };
type RosterEntry = {
  id?:string; rosterMembershipId:string; playerId:string; status:"active"|"inactive"; starter:boolean; captain:boolean; emergency:boolean; specialTeamsRole:string;
  firstName:string; lastName:string; portrait:string; jerseyNumber:number|null; primaryPosition:string; secondaryPosition:string; unit:string; availability:string; rosterStatus:string;
};
type Revision = { id:string; revisionNo:number; label:string; sourceDepthSnapshotId:string|null; lockedBy:string; createdAt:string };
type Payload = {
  game:{ id:string; opponent:string; opponentLogo:string; kickoff:string|null; status:string; seasonId:string; seasonYear:number|null; seasonName:string };
  control:Control|null; currentDepthSnapshot:DepthSnapshot|null; entries:RosterEntry[]; revisions:Revision[];
};

type UnitFilter = "all"|"offense"|"defense"|"special-teams";

export function GamedayRosterManager(){
  const[games,setGames]=useState<GameBase[]>([]);
  const[gameId,setGameId]=useState("");
  const[data,setData]=useState<Payload|null>(null);
  const[entries,setEntries]=useState<RosterEntry[]>([]);
  const[query,setQuery]=useState("");
  const[unit,setUnit]=useState<UnitFilter>("all");
  const[notice,setNotice]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[dirty,setDirty]=useState(false);

  useEffect(()=>{void boot()},[]);

  async function boot(){
    setLoading(true);
    try{
      const response=await fetch("/admin/api/gameday-roster?base=1");
      if(!response.ok)throw new Error("Spieltage konnten nicht geladen werden.");
      const body=await response.json() as {games:GameBase[]};
      setGames(body.games);
      const fromUrl=new URLSearchParams(window.location.search).get("game");
      const selected=(fromUrl?body.games.find(game=>game.id===fromUrl):undefined)??body.games.find(game=>game.status==="live")??body.games.find(game=>game.status==="upcoming")??body.games[0];
      if(selected){setGameId(selected.id);await loadGame(selected.id)}
    }catch(error){setNotice(error instanceof Error?error.message:"Fehler beim Laden.")}finally{setLoading(false)}
  }

  async function loadGame(id:string){
    const response=await fetch(`/admin/api/gameday-roster?game=${encodeURIComponent(id)}`);
    if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Gameday-Roster konnte nicht geladen werden.")}
    const body=await response.json() as Payload;
    setData(body);setEntries(body.entries.map(entry=>({...entry})));setDirty(false);
  }

  async function changeGame(id:string){
    if(dirty&&!confirm("Ungespeicherte Änderungen verwerfen und Spiel wechseln?"))return;
    setGameId(id);setLoading(true);setNotice("");
    window.history.replaceState(null,"",`/admin/gameday-roster?game=${encodeURIComponent(id)}`);
    try{await loadGame(id)}catch(error){setNotice(error instanceof Error?error.message:"Gameday-Roster konnte nicht geladen werden.")}finally{setLoading(false)}
  }

  function patch(playerId:string,change:Partial<RosterEntry>){
    if(data?.control?.status==="locked")return;
    setEntries(current=>current.map(entry=>entry.playerId===playerId?{...entry,...change}:entry));setDirty(true);
  }

  async function initialize(){
    if(!gameId)return;
    if(entries.length&&!confirm("Gameday-Roster neu aus Season Roster und aktuellem Depth Chart aufbauen? Nicht gesperrte Änderungen werden ersetzt."))return;
    setSaving(true);setNotice("");
    try{
      const response=await fetch("/admin/api/gameday-roster",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"initialize",gameId})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Initialisierung fehlgeschlagen.")}
      const body=await response.json() as {count:number;sourceDepthSnapshotId:string|null};
      await loadGame(gameId);
      setNotice(`Gameday-Roster aufgebaut · ${body.count} Spieler übernommen${body.sourceDepthSnapshotId?" · Depth Chart verknüpft":""}.`);
    }catch(error){setNotice(error instanceof Error?error.message:"Initialisierung fehlgeschlagen.")}finally{setSaving(false)}
  }

  async function saveEntries(showNotice=true){
    if(!gameId||!data?.control)return false;
    setSaving(true);if(showNotice)setNotice("");
    try{
      const response=await fetch("/admin/api/gameday-roster",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"save",gameId,entries:entries.map(({rosterMembershipId,playerId,status,starter,captain,emergency,specialTeamsRole})=>({rosterMembershipId,playerId,status,starter,captain,emergency,specialTeamsRole}))})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Speichern fehlgeschlagen.")}
      setDirty(false);if(showNotice)setNotice("Gameday-Roster gespeichert.");return true;
    }catch(error){setNotice(error instanceof Error?error.message:"Speichern fehlgeschlagen.");return false}finally{setSaving(false)}
  }

  async function lockRoster(){
    if(!data?.control)return;
    if(dirty&&!(await saveEntries(false)))return;
    if(!confirm("Gameday-Roster sperren? Dabei wird ein unveränderlicher historischer Snapshot erzeugt."))return;
    setSaving(true);setNotice("");
    try{
      const response=await fetch("/admin/api/gameday-roster",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({action:"lock",gameId})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Sperren fehlgeschlagen.")}
      const body=await response.json() as {revisionNo:number;activeCount:number};
      await loadGame(gameId);setNotice(`Gameday-Roster gesperrt · Revision ${body.revisionNo} · ${body.activeCount} aktive Spieler.`);
    }catch(error){setNotice(error instanceof Error?error.message:"Sperren fehlgeschlagen.")}finally{setSaving(false)}
  }

  async function unlockRoster(){
    if(!confirm("Roster wieder zur Bearbeitung öffnen? Der zuletzt gesperrte Snapshot bleibt historisch erhalten."))return;
    setSaving(true);setNotice("");
    try{
      const response=await fetch("/admin/api/gameday-roster",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({action:"unlock",gameId})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Entsperren fehlgeschlagen.")}
      await loadGame(gameId);setNotice("Gameday-Roster wieder zur Bearbeitung geöffnet. Historische Revision bleibt erhalten.");
    }catch(error){setNotice(error instanceof Error?error.message:"Entsperren fehlgeschlagen.")}finally{setSaving(false)}
  }

  const filtered=useMemo(()=>entries.filter(entry=>{
    const matchesUnit=unit==="all"||entry.unit===unit;
    const haystack=`${entry.firstName} ${entry.lastName} ${entry.jerseyNumber??""} ${entry.primaryPosition} ${entry.secondaryPosition} ${entry.specialTeamsRole}`.toLowerCase();
    return matchesUnit&&haystack.includes(query.toLowerCase());
  }),[entries,unit,query]);
  const stats=useMemo(()=>({
    total:entries.length,
    active:entries.filter(entry=>entry.status==="active").length,
    inactive:entries.filter(entry=>entry.status==="inactive").length,
    starters:entries.filter(entry=>entry.status==="active"&&entry.starter).length,
    captains:entries.filter(entry=>entry.status==="active"&&entry.captain).length,
    warnings:entries.filter(entry=>entry.status==="active"&&["out"].includes(entry.availability)).length,
  }),[entries]);
  const locked=data?.control?.status==="locked";
  const currentGame=games.find(game=>game.id===gameId);

  return <AdminShell active="gamedayroster" title="Gameday Roster" actions={<>
    <a className="cms-button secondary" href={`/admin/depth-chart${data?.game.seasonId?`?season=${encodeURIComponent(data.game.seasonId)}`:""}`}>Depth Chart</a>
    {data?.control&&!locked&&<button className="cms-button secondary" disabled={saving||!dirty} onClick={()=>void saveEntries()}>{saving?"Speichert…":"Änderungen speichern"}</button>}
    {data?.control&&!locked&&<button className="cms-button" disabled={saving||!entries.length} onClick={()=>void lockRoster()}>Roster sperren</button>}
    {locked&&<button className="cms-button" disabled={saving} onClick={()=>void unlockRoster()}>Roster entsperren</button>}
  </>}>
    {notice&&<AdminNotice tone={notice.includes("gesperrt")||notice.includes("gespeichert")||notice.includes("aufgebaut")||notice.includes("geöffnet")?"success":"error"}>{notice}</AdminNotice>}

    <AdminCard className="gdr-game-card">
      <div className="gdr-game-head">
        <label className="cms-field"><span>Spiel</span><select value={gameId} onChange={e=>void changeGame(e.target.value)}>{games.map(game=><option key={game.id} value={game.id}>{game.status==="live"?"LIVE · ":""}{formatDate(game.kickoff)} · Rascals vs {game.opponent}</option>)}</select></label>
        <div className="gdr-matchup"><img src="/rascals-logo-transparent-4k.png" alt=""/><span><small>{data?.game.seasonName||currentGame?.seasonName||"SAISON"}</small><b>RASCALS <i>VS</i> {data?.game.opponent||currentGame?.opponent||"—"}</b><em>{formatDate(data?.game.kickoff||currentGame?.kickoff||null)}</em></span>{data?.game.opponentLogo||currentGame?.opponentLogo?<img src={data?.game.opponentLogo||currentGame?.opponentLogo} alt=""/>:<div className="gdr-opponent-placeholder">?</div>}</div>
        <div className={`gdr-lock-state ${locked?"locked":"draft"}`}><strong>{locked?"LOCKED":"DRAFT"}</strong><small>{locked?`Gesperrt ${formatDateTime(data?.control?.lockedAt)}`:"Bearbeitbar"}</small></div>
      </div>
      <div className="gdr-source-row"><span>Quelle Depth Chart: <b>{data?.currentDepthSnapshot?.label??"Kein aktueller Depth Chart"}</b></span>{data?.control?.sourceDepthSnapshotId&&<span>Verknüpft: <b>{data.control.sourceDepthSnapshotId===data.currentDepthSnapshot?.id?"aktuelle Version":"ältere Version"}</b></span>}{data?.control?.updatedBy&&<span>Letzte Änderung: <b>{data.control.updatedBy}</b></span>}</div>
    </AdminCard>

    {!data?.control&&<AdminCard className="gdr-empty"><div><small>GAME ROSTER NOT INITIALIZED</small><h2>Spieltag aus Saisonkader aufbauen</h2><p>RASCALS OS übernimmt den Saisonkader, Availability, Captains und – sofern vorhanden – Starter sowie Special-Teams-Rollen aus dem aktuellen Depth Chart.</p></div><button className="cms-button" disabled={saving||!gameId} onClick={()=>void initialize()}>{saving?"Wird aufgebaut…":"Aus Season Roster + Depth Chart übernehmen"}</button></AdminCard>}

    {data?.control&&<>
      <div className="gdr-kpis"><article><small>GAME ROSTER</small><b>{stats.total}</b></article><article><small>ACTIVE</small><b>{stats.active}</b></article><article><small>INACTIVE</small><b>{stats.inactive}</b></article><article><small>STARTERS</small><b>{stats.starters}</b></article><article><small>CAPTAINS</small><b>{stats.captains}</b></article><article className={stats.warnings?"warning":"ok"}><small>AVAILABILITY WARNINGS</small><b>{stats.warnings}</b></article></div>

      {stats.warnings>0&&<AdminNotice tone="info">{stats.warnings} als OUT markierte Spieler stehen aktuell noch auf ACTIVE. Vor dem Lock bitte prüfen.</AdminNotice>}
      {locked&&<AdminNotice tone="info">Dieser Roster ist für den Spieltag gesperrt. Der aktuelle Stand ist historisch als Revision gespeichert. Zum Ändern muss der Roster bewusst entsperrt werden.</AdminNotice>}

      <AdminCard>
        <div className="cms-section-head"><div><small>GAME DAY PERSONNEL</small><h2>Active / Inactive & Rollen</h2></div><button className="cms-button secondary" disabled={locked||saving} onClick={()=>void initialize()}>Neu aus Foundation aufbauen</button></div>
        <div className="gdr-filters"><input placeholder="Spieler, Nummer, Position…" value={query} onChange={e=>setQuery(e.target.value)}/><div>{(["all","offense","defense","special-teams"] as UnitFilter[]).map(value=><button key={value} className={unit===value?"active":""} onClick={()=>setUnit(value)}>{value==="all"?"ALLE":value==="special-teams"?"SPECIAL TEAMS":value.toUpperCase()}</button>)}</div></div>
        <div className="gdr-table-wrap"><table className="gdr-table"><thead><tr><th>Spieler</th><th>Availability</th><th>Game Status</th><th>Starter</th><th>Captain</th><th>Emergency</th><th>Special Teams Role</th></tr></thead><tbody>{filtered.map(entry=><tr key={entry.playerId} className={entry.status==="inactive"?"inactive":""}>
          <td><div className="gdr-player">{entry.portrait?<img src={entry.portrait} alt=""/>:<span>#{entry.jerseyNumber??"–"}</span>}<div><b>#{entry.jerseyNumber??"–"} {entry.firstName} {entry.lastName}</b><small>{entry.primaryPosition||"–"}{entry.secondaryPosition?` / ${entry.secondaryPosition}`:""} · {entry.unit.toUpperCase()}</small></div></div></td>
          <td><em className={`gdr-av ${entry.availability}`}>{availabilityLabel(entry.availability)}</em></td>
          <td><select disabled={locked} value={entry.status} onChange={e=>patch(entry.playerId,{status:e.target.value as RosterEntry["status"]})}><option value="active">ACTIVE</option><option value="inactive">INACTIVE</option></select></td>
          <td><input disabled={locked||entry.status==="inactive"} type="checkbox" checked={entry.starter} onChange={e=>patch(entry.playerId,{starter:e.target.checked})}/></td>
          <td><input disabled={locked||entry.status==="inactive"} type="checkbox" checked={entry.captain} onChange={e=>patch(entry.playerId,{captain:e.target.checked})}/></td>
          <td><input disabled={locked} type="checkbox" checked={entry.emergency} onChange={e=>patch(entry.playerId,{emergency:e.target.checked})}/></td>
          <td><input disabled={locked} value={entry.specialTeamsRole} onChange={e=>patch(entry.playerId,{specialTeamsRole:e.target.value})} placeholder="z. B. KR, Punt, Gunner"/></td>
        </tr>)}</tbody></table></div>
        {!filtered.length&&<p className="cms-muted">Keine Spieler entsprechen dem Filter.</p>}
      </AdminCard>

      <div className="gdr-bottom-grid">
        <AdminCard><div className="cms-section-head"><div><small>ROSTER CONTROL</small><h2>Game Ready Check</h2></div></div><div className="gdr-checks"><span className={entries.length?"ok":"warn"}>Season Roster übernommen <b>{entries.length?"✓":"!"}</b></span><span className={data.currentDepthSnapshot?"ok":"warn"}>Depth Chart vorhanden <b>{data.currentDepthSnapshot?"✓":"!"}</b></span><span className={stats.active>0?"ok":"warn"}>Aktive Spieler vorhanden <b>{stats.active>0?"✓":"!"}</b></span><span className={!stats.warnings?"ok":"warn"}>Availability geprüft <b>{!stats.warnings?"✓":"!"}</b></span><span className={locked?"ok":"warn"}>Roster Lock <b>{locked?"✓":"!"}</b></span></div></AdminCard>
        <AdminCard><div className="cms-section-head"><div><small>HISTORIE</small><h2>Locked Revisions</h2></div><a className="cms-button secondary" href={`/admin/gameday?game=${encodeURIComponent(gameId)}`}>Zum Liveticker →</a></div><div className="gdr-revisions">{data.revisions.map(revision=><div key={revision.id}><span><b>Revision {revision.revisionNo}</b><small>{formatDateTime(revision.createdAt)} · {revision.lockedBy||"—"}</small></span><em>LOCKED</em></div>)}{!data.revisions.length&&<p className="cms-muted">Noch keine gesperrte Revision vorhanden.</p>}</div></AdminCard>
      </div>
    </>}
  </AdminShell>
}

function availabilityLabel(value:string){return({full:"FULL",limited:"LIMITED",questionable:"QUESTIONABLE",out:"OUT","return-to-play":"RTP"} as Record<string,string>)[value]??value.toUpperCase()}
function formatDate(value:string|null|undefined){if(!value)return"Datum offen";const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)}
function formatDateTime(value:string|null|undefined){if(!value)return"—";const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)}
