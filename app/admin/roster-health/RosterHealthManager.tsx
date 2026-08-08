"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./roster-health.css";

type Season = { id:string; year:number; name:string; isCurrent:boolean };
type Summary = { total:number; active:number; gameReady:number; available:number; limited:number; out:number; rookies:number; nonRookies:number; captains:number; returning:number; unsure:number; leaving:number; unknown:number };
type PositionGroup = { key:string; label:string; total:number; active:number; gameReady:number; limited:number; out:number; rookies:number; returning:number; unsure:number; leaving:number; configured:boolean; targetCount:number|null; minimumReady:number|null; gap:number|null; readyGap:number|null };
type DepthRisk = { slot:string; playerId:string; firstName:string; lastName:string; jerseyNumber:number|null; availability:string; rosterStatus:string };
type Payload = {
  seasons:Season[]; season:Season; summary:Summary; positionGroups:PositionGroup[];
  depth:{ snapshot:{id:string;label:string;createdAt:string}|null; expectedSlots:number; startersAssigned:number; backupsAssigned:number; missingStarters:string[]; missingBackups:string[]; starterRisks:DepthRisk[] };
  nextGame:null|{ id:string; opponent:string; kickoff:string|null; status:string; rosterStatus:string; lockedAt:string|null; total:number; active:number; inactive:number };
};
type TargetDraft = Record<string,{targetCount:string;minimumReady:string}>;

export function RosterHealthManager(){
  const[data,setData]=useState<Payload|null>(null);
  const[seasonId,setSeasonId]=useState("");
  const[targets,setTargets]=useState<TargetDraft>({});
  const[notice,setNotice]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);

  useEffect(()=>{void boot()},[]);

  async function boot(){
    const requested=new URLSearchParams(window.location.search).get("season");
    await load(requested||undefined);
  }

  async function load(requestedSeason?:string){
    setLoading(true);setNotice("");
    try{
      const params=new URLSearchParams({teamId:"mens"});if(requestedSeason)params.set("seasonId",requestedSeason);
      const response=await fetch(`/admin/api/roster-health?${params.toString()}`);
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Roster Health konnte nicht geladen werden.")}
      const body=await response.json() as Payload;
      setData(body);setSeasonId(body.season.id);
      const draft:TargetDraft={};
      for(const group of body.positionGroups)draft[group.key]={targetCount:group.targetCount==null?"":String(group.targetCount),minimumReady:group.minimumReady==null?"":String(group.minimumReady)};
      setTargets(draft);
    }catch(error){setNotice(error instanceof Error?error.message:"Fehler beim Laden.")}finally{setLoading(false)}
  }

  async function changeSeason(id:string){
    setSeasonId(id);window.history.replaceState(null,"",`/admin/roster-health?season=${encodeURIComponent(id)}`);await load(id);
  }

  function patchTarget(key:string,field:"targetCount"|"minimumReady",value:string){
    setTargets(current=>({...current,[key]:{targetCount:current[key]?.targetCount??"",minimumReady:current[key]?.minimumReady??"",[field]:value}}));
  }

  async function saveTargets(){
    if(!data)return;
    const items=data.positionGroups.filter(group=>targets[group.key]?.targetCount!==""||targets[group.key]?.minimumReady!=="").map(group=>({
      positionGroup:group.key,
      targetCount:Number(targets[group.key]?.targetCount||0),
      minimumReady:Number(targets[group.key]?.minimumReady||0),
    }));
    for(const item of items){if(!Number.isInteger(item.targetCount)||item.targetCount<0||!Number.isInteger(item.minimumReady)||item.minimumReady<0||item.minimumReady>item.targetCount){setNotice("Bitte gültige Zielwerte setzen: Minimum Game Ready darf nicht größer als die Ziel-Kaderstärke sein.");return}}
    setSaving(true);setNotice("");
    try{
      const response=await fetch("/admin/api/roster-health",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({seasonId:data.season.id,teamId:"mens",targets:items})});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error??"Zielwerte konnten nicht gespeichert werden.")}
      await load(data.season.id);setNotice("Positions-Zielwerte gespeichert.");
    }catch(error){setNotice(error instanceof Error?error.message:"Speichern fehlgeschlagen.")}finally{setSaving(false)}
  }

  const readiness=useMemo(()=>data?.summary.active?Math.round((data.summary.gameReady/data.summary.active)*100):0,[data]);
  const planningKnown=useMemo(()=>data?data.summary.returning+data.summary.unsure+data.summary.leaving:0,[data]);
  const configuredTargets=useMemo(()=>data?.positionGroups.filter(group=>group.configured).length??0,[data]);
  const recruitingNeed=useMemo(()=>data?.positionGroups.reduce((sum,group)=>sum+(group.gap??0),0)??0,[data]);
  const readyNeed=useMemo(()=>data?.positionGroups.reduce((sum,group)=>sum+(group.readyGap??0),0)??0,[data]);

  return <AdminShell active="rosterhealth" title="Roster Health" actions={<><a className="cms-button secondary" href={`/admin/roster${seasonId?`?season=${encodeURIComponent(seasonId)}`:""}`}>Season Roster</a><button className="cms-button" disabled={saving||loading||!data} onClick={()=>void saveTargets()}>{saving?"Speichert…":"Zielwerte speichern"}</button></>}>
    {notice&&<AdminNotice tone={notice.includes("gespeichert")?"success":"error"}>{notice}</AdminNotice>}

    <div className="rh-toolbar">
      <label className="cms-field"><span>Saison</span><select value={seasonId} onChange={e=>void changeSeason(e.target.value)}>{data?.seasons.map(season=><option key={season.id} value={season.id}>{season.name}{season.isCurrent?" · AKTUELL":""}</option>)}</select></label>
      <div className="rh-readiness"><span><small>GAME READY</small><b>{readiness}%</b></span><div><i style={{width:`${Math.min(100,readiness)}%`}}/></div><small>{data?.summary.gameReady??0} von {data?.summary.active??0} aktiven Spielern mit FULL Availability</small></div>
    </div>

    <div className="rh-kpis">
      <article><small>SEASON ROSTER</small><b>{data?.summary.total??0}</b><span>{data?.summary.active??0} Active</span></article>
      <article><small>GAME READY</small><b>{data?.summary.gameReady??0}</b><span>{data?.summary.available??0} verfügbar</span></article>
      <article className={(data?.summary.limited??0)>0?"warning":""}><small>LIMITED / RTP</small><b>{data?.summary.limited??0}</b><span>Beobachten</span></article>
      <article className={(data?.summary.out??0)>0?"danger":""}><small>OUT / UNAVAILABLE</small><b>{data?.summary.out??0}</b><span>nicht game ready</span></article>
      <article><small>CAPTAINS</small><b>{data?.summary.captains??0}</b><span>Leadership</span></article>
      <article><small>ROOKIES</small><b>{data?.summary.rookies??0}</b><span>{data?.summary.nonRookies??0} Non-Rookies</span></article>
    </div>

    <div className="rh-main-grid">
      <AdminCard className="rh-position-card">
        <div className="cms-section-head"><div><small>POSITION HEALTH</small><h2>Roster Strength & Planning Targets</h2></div><span className="cms-muted">{configuredTargets}/{data?.positionGroups.length??0} Gruppen mit Zielwert</span></div>
        <p className="cms-muted">Die Zielwerte sind bewusst nicht automatisch vorgegeben. Head Coach / Football Ops definiert die gewünschte Kaderstärke und die Mindestzahl game-ready Spieler pro Positionsgruppe.</p>
        <div className="rh-position-table-wrap"><table className="rh-position-table"><thead><tr><th>Position Group</th><th>Roster</th><th>Ready</th><th>Limited</th><th>Out</th><th>Ziel</th><th>Min. Ready</th><th>Gap</th></tr></thead><tbody>{data?.positionGroups.map(group=>{
          const gap=(group.gap??0)+(group.readyGap??0);return <tr key={group.key} className={gap>0?"risk":""}><td><b>{group.label}</b><small>{group.returning} returning · {group.unsure} unsure · {group.leaving} leaving</small></td><td>{group.total}</td><td><strong>{group.gameReady}</strong></td><td>{group.limited}</td><td>{group.out}</td><td><input type="number" min="0" max="99" value={targets[group.key]?.targetCount??""} placeholder="–" onChange={e=>patchTarget(group.key,"targetCount",e.target.value)}/></td><td><input type="number" min="0" max="99" value={targets[group.key]?.minimumReady??""} placeholder="–" onChange={e=>patchTarget(group.key,"minimumReady",e.target.value)}/></td><td>{!group.configured&&targets[group.key]?.targetCount===""?<em className="unconfigured">SETZEN</em>:(group.gap??0)>0|| (group.readyGap??0)>0?<em className="gap">{group.gap??0} Roster · {group.readyGap??0} Ready</em>:<em className="ok">OK</em>}</td></tr>
        })}</tbody></table></div>
        <div className="rh-target-summary"><span><small>RECRUITING GAP</small><b>{recruitingNeed}</b></span><span><small>READY GAP</small><b>{readyNeed}</b></span><span><small>CONFIGURED GROUPS</small><b>{configuredTargets}</b></span></div>
      </AdminCard>

      <div className="rh-side-stack">
        <AdminCard>
          <div className="cms-section-head"><div><small>NEXT SEASON</small><h2>Roster Planning</h2></div><a href={`/admin/roster${seasonId?`?season=${encodeURIComponent(seasonId)}`:""}`}>Spieler pflegen →</a></div>
          <div className="rh-planning"><article><b>{data?.summary.returning??0}</b><span>Returning</span></article><article><b>{data?.summary.unsure??0}</b><span>Unsure</span></article><article><b>{data?.summary.leaving??0}</b><span>Leaving</span></article><article className={(data?.summary.unknown??0)>0?"warning":""}><b>{data?.summary.unknown??0}</b><span>Noch offen</span></article></div>
          <p className="cms-muted">{planningKnown}/{data?.summary.total??0} Spieler haben bereits einen Planungsstatus für die Folgesaison.</p>
        </AdminCard>

        <AdminCard>
          <div className="cms-section-head"><div><small>NEXT GAME</small><h2>{data?.nextGame?`vs. ${data.nextGame.opponent}`:"Kein kommendes Spiel"}</h2></div>{data?.nextGame&&<a href={`/admin/gameday-roster?game=${encodeURIComponent(data.nextGame.id)}`}>Gameday Roster →</a>}</div>
          {data?.nextGame?<div className="rh-nextgame"><span><small>KICKOFF</small><b>{formatDate(data.nextGame.kickoff)}</b></span><span><small>ROSTER STATUS</small><b>{data.nextGame.rosterStatus.toUpperCase()}</b></span><span><small>ACTIVE</small><b>{data.nextGame.active}/{data.nextGame.total}</b></span></div>:<p className="cms-muted">Für diese Saison ist aktuell kein Live-/Upcoming-Spiel vorhanden.</p>}
        </AdminCard>
      </div>
    </div>

    <AdminCard className="rh-depth-card">
      <div className="cms-section-head"><div><small>DEPTH RISK</small><h2>Starter & Backup Coverage</h2></div><a className="cms-button secondary" href={`/admin/depth-chart${seasonId?`?season=${encodeURIComponent(seasonId)}`:""}`}>Depth Chart öffnen</a></div>
      {!data?.depth.snapshot?<AdminNotice tone="info">Noch kein aktueller Depth-Chart-Snapshot. Sobald eine Version gespeichert wurde, bewertet Roster Health fehlende Starter, Backup-Lücken und Availability-Risiken.</AdminNotice>:<>
        <div className="rh-depth-kpis"><span><small>VERSION</small><b>{data.depth.snapshot.label}</b></span><span><small>STARTERS</small><b>{data.depth.startersAssigned}/{data.depth.expectedSlots}</b></span><span><small>BACKUPS</small><b>{data.depth.backupsAssigned}/{data.depth.expectedSlots}</b></span><span className={data.depth.starterRisks.length?"danger":""}><small>STARTER RISKS</small><b>{data.depth.starterRisks.length}</b></span></div>
        <div className="rh-depth-columns">
          <section><h3>Fehlende Starter</h3><div className="rh-chips">{data.depth.missingStarters.slice(0,16).map(slot=><span key={slot}>{slot}</span>)}{!data.depth.missingStarters.length&&<em>Keine offenen Starter-Slots</em>}{data.depth.missingStarters.length>16&&<em>+{data.depth.missingStarters.length-16} weitere</em>}</div></section>
          <section><h3>Fehlende Backups</h3><div className="rh-chips muted">{data.depth.missingBackups.slice(0,16).map(slot=><span key={slot}>{slot}</span>)}{!data.depth.missingBackups.length&&<em>Keine offenen Backup-Slots</em>}{data.depth.missingBackups.length>16&&<em>+{data.depth.missingBackups.length-16} weitere</em>}</div></section>
          <section><h3>Starter Availability</h3><div className="rh-risk-list">{data.depth.starterRisks.map(risk=><div key={`${risk.slot}-${risk.playerId}`}><b>{risk.slot} · #{risk.jerseyNumber??"–"} {risk.firstName} {risk.lastName}</b><span>{risk.availability.toUpperCase()} · {risk.rosterStatus.toUpperCase()}</span></div>)}{!data.depth.starterRisks.length&&<em>Keine Availability-Risiken bei gesetzten Startern.</em>}</div></section>
        </div>
      </>}
    </AdminCard>
  </AdminShell>
}

function formatDate(value:string|null){if(!value)return"–";const date=new Date(value);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)}
