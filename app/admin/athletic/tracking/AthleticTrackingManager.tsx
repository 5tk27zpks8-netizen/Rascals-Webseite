"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../../_components/AdminShell";
import "./athletic-tracking.css";

type Player = { id:string; firstName:string; lastName:string; jerseyNumber:number|null; position:string; unit:string; portrait:string };
type Entry = { id:string; playerId:string; firstName:string; lastName:string; jerseyNumber:number|null; position:string; category:string; metricKey:string; metricLabel:string; value:number; unit:string; measuredAt:string; note:string; createdBy:string };
type Metric = { key:string; label:string; unit:string; category:string; hint:string };

const metrics: Metric[] = [
  { key:"weight", label:"Körpergewicht", unit:"kg", category:"body", hint:"Aktuelles Körpergewicht" },
  { key:"forty_yard", label:"40 Yard Dash", unit:"s", category:"speed", hint:"Elektronisch oder handgestoppt" },
  { key:"ten_yard_split", label:"10 Yard Split", unit:"s", category:"speed", hint:"Beschleunigung" },
  { key:"flying_20", label:"Flying 20", unit:"s", category:"speed", hint:"Top-Speed Abschnitt" },
  { key:"pro_agility", label:"5-10-5 Shuttle", unit:"s", category:"agility", hint:"Change of Direction" },
  { key:"three_cone", label:"3 Cone Drill", unit:"s", category:"agility", hint:"Agility / Body Control" },
  { key:"vertical_jump", label:"Vertical Jump", unit:"cm", category:"power", hint:"Explosivkraft" },
  { key:"broad_jump", label:"Broad Jump", unit:"cm", category:"power", hint:"Horizontale Explosivkraft" },
  { key:"bench_press", label:"Bench Press", unit:"kg", category:"strength", hint:"Bestleistung oder definierter Test" },
  { key:"squat", label:"Squat", unit:"kg", category:"strength", hint:"Bestleistung oder definierter Test" },
  { key:"deadlift", label:"Deadlift", unit:"kg", category:"strength", hint:"Bestleistung oder definierter Test" },
  { key:"conditioning", label:"Conditioning Test", unit:"score", category:"conditioning", hint:"Teamdefinierter Conditioning Score" },
];

const categories = [
  ["all","Alle"],["speed","Speed"],["agility","Agility"],["power","Power"],["strength","Strength"],["conditioning","Conditioning"],["body","Body"],
] as const;

export function AthleticTrackingManager(){
  const [players,setPlayers]=useState<Player[]>([]),[entries,setEntries]=useState<Entry[]>([]),[playerId,setPlayerId]=useState(""),[metricKey,setMetricKey]=useState(metrics[0].key),[value,setValue]=useState(""),[measuredAt,setMeasuredAt]=useState(toLocal(new Date().toISOString())),[note,setNote]=useState(""),[categoryFilter,setCategoryFilter]=useState("all"),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  useEffect(()=>{void load()},[]);
  async function load(nextPlayer?:string){setLoading(true);setNotice("");try{const q=new URLSearchParams();if(nextPlayer)q.set("playerId",nextPlayer);const r=await fetch(`/admin/api/athletic-tracking?${q}`),b=await r.json();if(!r.ok)throw new Error(b.error??"Tracking konnte nicht geladen werden.");setPlayers(b.players??[]);setEntries(b.entries??[]);const selected=nextPlayer||playerId||b.players?.[0]?.id||"";setPlayerId(selected)}catch(e){setNotice(e instanceof Error?e.message:"Fehler beim Laden.")}finally{setLoading(false)}}
  async function changePlayer(id:string){setPlayerId(id);await load(id)}
  async function save(){const metric=metrics.find(m=>m.key===metricKey);if(!playerId||!metric||value.trim()===""){setNotice("Spieler, Test und Wert auswählen.");return}setSaving(true);setNotice("");try{const r=await fetch("/admin/api/athletic-tracking",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({playerId,category:metric.category,metricKey:metric.key,metricLabel:metric.label,value:Number(value),unit:metric.unit,measuredAt:measuredAt?new Date(measuredAt).toISOString():new Date().toISOString(),note})}),b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error??"Messwert konnte nicht gespeichert werden.");setValue("");setNote("");setNotice("Messwert gespeichert.");await load(playerId)}catch(e){setNotice(e instanceof Error?e.message:"Speichern fehlgeschlagen.")}finally{setSaving(false)}}
  const player=players.find(p=>p.id===playerId)||null;const metric=metrics.find(m=>m.key===metricKey)!;
  const visible=useMemo(()=>entries.filter(e=>e.playerId===playerId&&(categoryFilter==="all"||e.category===categoryFilter)),[entries,playerId,categoryFilter]);
  const latest=useMemo(()=>{const m=new Map<string,Entry>();for(const e of entries.filter(x=>x.playerId===playerId))if(!m.has(e.metricKey))m.set(e.metricKey,e);return [...m.values()]},[entries,playerId]);
  return <AdminShell active="tracking" title="Athletic Tracking" eyebrow="RASCALS OS · ATHLETIC" actions={<a className="cms-button secondary" href="/admin/training-operations">Training öffnen</a>}>
    {notice&&<AdminNotice tone={notice.includes("gespeichert")?"success":"error"}>{notice}</AdminNotice>}
    <div className="at-shell">
      <AdminCard className="at-intro"><div><small>COACH WORKSPACE</small><h2>Spieler auswählen. Wert eintragen. Fertig.</h2><p>Speed, Agility, Strength, Power, Conditioning und Körperdaten werden hier zentral erfasst. Analyse und Interpretation bleiben bewusst getrennt.</p></div></AdminCard>
      <div className="at-grid">
        <AdminCard className="at-entry"><div className="cms-section-head"><div><small>NEUER MESSWERT</small><h2>Tracking erfassen</h2></div></div>
          <label className="cms-field"><span>1 · Spieler</span><select disabled={loading} value={playerId} onChange={e=>void changePlayer(e.target.value)}><option value="">Spieler auswählen</option>{players.map(p=><option key={p.id} value={p.id}>#{p.jerseyNumber??"–"} {p.firstName} {p.lastName}{p.position?` · ${p.position}`:""}</option>)}</select></label>
          <label className="cms-field"><span>2 · Test / Messwert</span><select value={metricKey} onChange={e=>setMetricKey(e.target.value)}>{metrics.map(m=><option key={m.key} value={m.key}>{m.label} · {m.unit}</option>)}</select><small>{metric.hint}</small></label>
          <div className="at-value-row"><label className="cms-field"><span>3 · Wert</span><div className="at-value"><input inputMode="decimal" value={value} onChange={e=>setValue(e.target.value.replace(",","."))} placeholder="0.00"/><b>{metric.unit}</b></div></label><label className="cms-field"><span>Datum</span><input type="datetime-local" value={measuredAt} onChange={e=>setMeasuredAt(e.target.value)}/></label></div>
          <label className="cms-field"><span>Notiz · optional</span><textarea rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="z. B. handgestoppt, nach Training, leichte Beschwerden …"/></label>
          <button className="cms-button at-save" disabled={saving||!playerId} onClick={()=>void save()}>{saving?"Speichert…":"Messwert speichern"}</button>
        </AdminCard>
        <div className="at-right">
          <AdminCard>{player?<div className="at-player-head"><div className="at-avatar">{player.portrait?<img src={player.portrait} alt=""/>:<span>#{player.jerseyNumber??"–"}</span>}</div><div><small>AKTUELLER SPIELER</small><h2>{player.firstName} {player.lastName}</h2><p>{player.position||"Position offen"} · {player.unit||"Unit offen"}</p><div className="at-links"><a href={`/admin/player-analysis?player=${player.id}`}>Analyse ansehen →</a><a href={`/admin/players?player=${player.id}`}>Stammdaten →</a></div></div></div>:<p>Spieler auswählen.</p>}</AdminCard>
          <AdminCard><div className="cms-section-head"><div><small>LETZTE WERTE</small><h2>Snapshot</h2></div></div><div className="at-snapshot">{latest.slice(0,8).map(e=><div key={e.metricKey}><span>{e.metricLabel}<small>{formatDate(e.measuredAt)}</small></span><b>{formatValue(e.value)} {e.unit}</b></div>)}{!latest.length&&<p className="cms-muted">Noch keine Athletic-Werte vorhanden.</p>}</div></AdminCard>
        </div>
      </div>
      <AdminCard><div className="cms-section-head"><div><small>HISTORIE</small><h2>Messwerte</h2></div></div><div className="at-filter">{categories.map(([key,label])=><button key={key} className={categoryFilter===key?"active":""} onClick={()=>setCategoryFilter(key)}>{label}</button>)}</div><div className="at-history">{visible.map(e=><article key={e.id}><div><strong>{e.metricLabel}</strong><small>{formatDate(e.measuredAt)} · {e.createdBy||"Coach"}</small>{e.note&&<p>{e.note}</p>}</div><b>{formatValue(e.value)} <small>{e.unit}</small></b></article>)}{!visible.length&&<p className="cms-muted">Für diesen Filter sind noch keine Werte vorhanden.</p>}</div></AdminCard>
    </div>
  </AdminShell>
}
function toLocal(value:string){const d=new Date(value),o=d.getTimezoneOffset();return new Date(d.getTime()-o*60000).toISOString().slice(0,16)}
function formatDate(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d)}
function formatValue(v:number){return Number.isInteger(v)?String(v):v.toFixed(2).replace(/0+$/,"").replace(/\.$/,"")}
