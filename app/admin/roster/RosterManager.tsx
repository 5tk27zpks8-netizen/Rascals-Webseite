"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./roster.css";

type Season = { id:string; year:number; name:string; status:"planning"|"active"|"completed"|"archived"; startsAt:string|null; endsAt:string|null; isCurrent:boolean };
type RosterItem = {
  id:string; seasonId:string; teamId:string; playerId:string; firstName:string; lastName:string; slug:string; portrait:string; jerseyNumber:number|null;
  primaryPosition:string; secondaryPosition:string; unit:"offense"|"defense"|"special-teams";
  rosterStatus:"active"|"practice-squad"|"reserve"|"injured"|"suspended"|"left"|"alumni";
  availability:"full"|"limited"|"questionable"|"out"|"return-to-play";
  starter:boolean; captain:boolean; rookie:boolean; leadershipRole:string; joinedAt:string|null; leftAt:string|null;
};

const positions=["QB","RB","FB","WR","TE","OL","C","G","T","DL","DE","DT","NT","LB","MLB","ILB","OLB","CB","DB","FS","SS","K","P","LS","KR","PR"];

export function RosterManager(){
  const[seasons,setSeasons]=useState<Season[]>([]);const[seasonId,setSeasonId]=useState("");const[items,setItems]=useState<RosterItem[]>([]);const[selected,setSelected]=useState<RosterItem|null>(null);const[query,setQuery]=useState("");const[notice,setNotice]=useState("");const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);

  useEffect(()=>{void boot()},[]);
  async function boot(){setLoading(true);try{const s=await fetch("/admin/api/seasons");if(!s.ok)throw new Error("Saisons konnten nicht geladen werden.");const sb=await s.json() as {items:Season[]};setSeasons(sb.items);const current=sb.items.find(x=>x.isCurrent)??sb.items[0];if(current){setSeasonId(current.id);await loadRoster(current.id)}}catch(e){setNotice(e instanceof Error?e.message:"Fehler beim Laden.")}finally{setLoading(false)}}
  async function loadRoster(id:string){const r=await fetch(`/admin/api/roster?seasonId=${encodeURIComponent(id)}&teamId=mens`);if(!r.ok)throw new Error("Roster konnte nicht geladen werden.");const body=await r.json() as {items:RosterItem[]};setItems(body.items);setSelected(body.items[0]??null)}
  async function changeSeason(id:string){setSeasonId(id);setLoading(true);setNotice("");try{await loadRoster(id)}catch(e){setNotice(e instanceof Error?e.message:"Roster konnte nicht geladen werden.")}finally{setLoading(false)}}
  async function save(){if(!selected)return;setSaving(true);setNotice("");try{const r=await fetch("/admin/api/roster",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(selected)});if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error??"Speichern fehlgeschlagen.")}const b=await r.json() as {item:RosterItem};const merged={...selected,...b.item};setSelected(merged);setItems(cur=>cur.map(x=>x.id===merged.id?merged:x));setNotice("Saison-Roster gespeichert.")}catch(e){setNotice(e instanceof Error?e.message:"Speichern fehlgeschlagen.")}finally{setSaving(false)}}
  const filtered=useMemo(()=>items.filter(x=>`${x.firstName} ${x.lastName} ${x.primaryPosition} ${x.secondaryPosition} ${x.jerseyNumber??""} ${x.rosterStatus}`.toLowerCase().includes(query.toLowerCase())),[items,query]);
  const counts=useMemo(()=>({total:items.length,active:items.filter(x=>x.rosterStatus==="active").length,full:items.filter(x=>x.availability==="full").length,limited:items.filter(x=>x.availability!=="full").length}),[items]);

  return <AdminShell active="roster" title="Season Roster" actions={<button className="cms-button" disabled={!selected||saving} onClick={()=>void save()}>{saving?"Speichert…":"Roster speichern"}</button>}>
    {notice&&<AdminNotice tone={notice.includes("gespeichert")?"success":"error"}>{notice}</AdminNotice>}
    <div className="roster-topline">
      <label className="cms-field"><span>Saison</span><select value={seasonId} onChange={e=>void changeSeason(e.target.value)}>{seasons.map(s=><option key={s.id} value={s.id}>{s.name}{s.isCurrent?" · AKTUELL":""}</option>)}</select></label>
      <div className="roster-kpis"><article><small>KADER</small><b>{counts.total}</b></article><article><small>AKTIV</small><b>{counts.active}</b></article><article><small>FULL</small><b>{counts.full}</b></article><article><small>EINGESCHRÄNKT</small><b>{counts.limited}</b></article></div>
    </div>
    <div className="roster-layout">
      <AdminCard className="roster-list-card">
        <div className="cms-section-head"><div><small>SEASON MEMBERSHIP</small><h2>{seasons.find(s=>s.id===seasonId)?.name??"Roster"}</h2></div></div>
        <input className="roster-search" placeholder="Name, Nummer, Position…" value={query} onChange={e=>setQuery(e.target.value)}/>
        <div className="roster-list">{filtered.map(p=><button key={p.id} className={selected?.id===p.id?"active":""} onClick={()=>setSelected(p)}>{p.portrait?<img src={p.portrait} alt=""/>:<span className="roster-avatar">#{p.jerseyNumber??"–"}</span>}<span><b>#{p.jerseyNumber??"–"} {p.firstName} {p.lastName}</b><small>{p.primaryPosition||"–"} · {p.unit.toUpperCase()} · {labelRoster(p.rosterStatus)}</small></span><em className={`availability ${p.availability}`}>{labelAvailability(p.availability)}</em></button>)}</div>
      </AdminCard>
      <div className="roster-editor-stack">
        <AdminCard>
          <div className="cms-section-head"><div><small>SAISONPROFIL</small><h2>{selected?`${selected.firstName} ${selected.lastName}`:"Spieler auswählen"}</h2></div></div>
          {!selected?<p className="cms-muted">Wähle links einen Spieler aus.</p>:<div className="cms-grid-2">
            <label className="cms-field"><span>Trikotnummer</span><input type="number" min="0" max="99" value={selected.jerseyNumber??""} onChange={e=>setSelected({...selected,jerseyNumber:e.target.value===""?null:Number(e.target.value)})}/><small>Doppelte Nummern werden serverseitig verhindert.</small></label>
            <label className="cms-field"><span>Unit</span><select value={selected.unit} onChange={e=>setSelected({...selected,unit:e.target.value as RosterItem["unit"]})}><option value="offense">Offense</option><option value="defense">Defense</option><option value="special-teams">Special Teams</option></select></label>
            <label className="cms-field"><span>Primary Position</span><select value={selected.primaryPosition} onChange={e=>setSelected({...selected,primaryPosition:e.target.value})}>{positions.map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="cms-field"><span>Secondary Position</span><select value={selected.secondaryPosition} onChange={e=>setSelected({...selected,secondaryPosition:e.target.value})}><option value="">—</option>{positions.map(x=><option key={x}>{x}</option>)}</select></label>
            <label className="cms-field"><span>Roster Status</span><select value={selected.rosterStatus} onChange={e=>setSelected({...selected,rosterStatus:e.target.value as RosterItem["rosterStatus"]})}><option value="active">Active</option><option value="practice-squad">Practice Squad</option><option value="reserve">Reserve</option><option value="injured">Injured</option><option value="suspended">Suspended</option><option value="left">Left Team</option><option value="alumni">Alumni</option></select></label>
            <label className="cms-field"><span>Availability</span><select value={selected.availability} onChange={e=>setSelected({...selected,availability:e.target.value as RosterItem["availability"]})}><option value="full">Full</option><option value="limited">Limited</option><option value="questionable">Questionable</option><option value="out">Out</option><option value="return-to-play">Return to Play</option></select></label>
            <label className="cms-field hero-full"><span>Leadership Role</span><input value={selected.leadershipRole} onChange={e=>setSelected({...selected,leadershipRole:e.target.value})} placeholder="z. B. Defense Captain, Position Leader"/></label>
          </div>}
          {selected&&<div className="roster-flags"><label><input type="checkbox" checked={selected.starter} onChange={e=>setSelected({...selected,starter:e.target.checked})}/> Starter</label><label><input type="checkbox" checked={selected.captain} onChange={e=>setSelected({...selected,captain:e.target.checked})}/> Captain</label><label><input type="checkbox" checked={selected.rookie} onChange={e=>setSelected({...selected,rookie:e.target.checked})}/> Rookie</label></div>}
        </AdminCard>
        <AdminCard><div className="cms-section-head"><div><small>FOOTBALL OPERATIONS</small><h2>Depth Chart</h2></div><a className="cms-button secondary" href={`/admin/depth-chart${seasonId?`?season=${encodeURIComponent(seasonId)}`:""}`}>Depth Chart öffnen →</a></div><p className="cms-muted">Starter, Backups und Third String werden versioniert geführt. Jede neue Aufstellung erzeugt einen Snapshot, sodass frühere Depth Charts nicht überschrieben werden.</p></AdminCard>
      </div>
    </div>
  </AdminShell>
}

function labelRoster(v:RosterItem["rosterStatus"]){return({active:"ACTIVE","practice-squad":"PRACTICE SQUAD",reserve:"RESERVE",injured:"INJURED",suspended:"SUSPENDED",left:"LEFT",alumni:"ALUMNI"} as const)[v]}
function labelAvailability(v:RosterItem["availability"]){return({full:"FULL",limited:"LIMITED",questionable:"QUESTIONABLE",out:"OUT","return-to-play":"RTP"} as const)[v]}
