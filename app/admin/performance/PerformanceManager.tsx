"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./performance.css";

type Player = { id:string; firstName:string; lastName:string; jerseyNumber:number|null; position:string; unit:string };
type Entry = { id:string; playerId:string; context:"training"|"game"|"review"; occurredAt:string; attendance:string; effort:number|null; execution:number|null; discipline:number|null; impact:number|null; overall:number|null; note:string; createdBy:string; };
type Summary = { attendancePct:number|null; effort:number|null; execution:number|null; discipline:number|null; impact:number|null; overall:number|null; trainingCount:number; gameReviews:number; };
type Trend = { id:string; date:string; context:string; index:number|null };
type Stat = { key:string; value:number };

const statLabels:Record<string,string>={touchdowns:"TD",interceptions:"INT",sacks:"Sacks",tackles:"Tackles",forced_fumbles:"FF",receiving_td:"Rec TD",rushing_td:"Rush TD",passing_td:"Pass TD",field_goals:"FG"};

export function PerformanceManager(){
 const[players,setPlayers]=useState<Player[]>([]); const[playerId,setPlayerId]=useState(""); const[entries,setEntries]=useState<Entry[]>([]); const[summary,setSummary]=useState<Summary|null>(null); const[trend,setTrend]=useState<Trend[]>([]); const[stats,setStats]=useState<Stat[]>([]); const[notice,setNotice]=useState(""); const[saving,setSaving]=useState(false);
 const[context,setContext]=useState<"training"|"game"|"review">("training"); const[occurredAt,setOccurredAt]=useState(()=>new Date().toISOString().slice(0,10)); const[attendance,setAttendance]=useState("present"); const[effort,setEffort]=useState(4); const[execution,setExecution]=useState(4); const[discipline,setDiscipline]=useState(4); const[impact,setImpact]=useState(4); const[overall,setOverall]=useState(0); const[note,setNote]=useState("");
 const player=useMemo(()=>players.find(p=>p.id===playerId)??null,[players,playerId]);
 useEffect(()=>{void loadBase()},[]); useEffect(()=>{if(playerId)void loadPlayer(playerId)},[playerId]);
 async function loadBase(){const r=await fetch("/admin/api/performance"); if(!r.ok)return setNotice("Performance-Daten konnten nicht geladen werden."); const b=await r.json() as {players:Player[]}; setPlayers(b.players); setPlayerId(b.players[0]?.id??"")}
 async function loadPlayer(id:string){const r=await fetch(`/admin/api/performance?playerId=${encodeURIComponent(id)}`); if(!r.ok)return setNotice("Spielerdaten konnten nicht geladen werden."); const b=await r.json() as {entries:Entry[];summary:Summary;trend:Trend[];stats:Stat[]}; setEntries(b.entries);setSummary(b.summary);setTrend(b.trend);setStats(b.stats)}
 async function addEntry(){if(!playerId)return;setSaving(true);setNotice("");try{const r=await fetch("/admin/api/performance",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({playerId,context,occurredAt,attendance:context==="training"?attendance:"none",effort,execution,discipline,impact,overall:overall||null,note})});if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error??"Speichern fehlgeschlagen.")}setNote("");setNotice("Performance-Eintrag gespeichert.");await loadPlayer(playerId)}catch(e){setNotice(e instanceof Error?e.message:"Speichern fehlgeschlagen.")}finally{setSaving(false)}}
 async function removeEntry(id:string){if(!confirm("Eintrag wirklich löschen?"))return;const r=await fetch(`/admin/api/performance?id=${encodeURIComponent(id)}`,{method:"DELETE"});if(!r.ok)return setNotice("Eintrag konnte nicht gelöscht werden.");setNotice("Eintrag gelöscht.");await loadPlayer(playerId)}
 return <AdminShell active="performance" title="Player Performance" eyebrow="RASCALS OS · FOOTBALL ANALYTICS">
  {notice&&<AdminNotice tone={notice.includes("gespeichert")||notice.includes("gelöscht")?"success":"error"}>{notice}</AdminNotice>}
  <AdminCard><div className="perf-head"><div><small>SPIELERANALYSE</small><h2>Entwicklung sichtbar machen</h2><p>Interne Coach-Auswertung aus Trainingsbeteiligung, Einsatz, Ausführung, Disziplin und Spielimpact. Subjektive Ratings bleiben intern.</p></div><label className="cms-field perf-player-select"><span>Spieler</span><select value={playerId} onChange={e=>setPlayerId(e.target.value)}>{players.map(p=><option key={p.id} value={p.id}>#{p.jerseyNumber??"–"} {p.firstName} {p.lastName} · {p.position}</option>)}</select></label></div></AdminCard>
  {player&&<>
   <div className="perf-kpis">
    <Metric label="Performance Index" value={summary?.overall} suffix="/100" strong />
    <Metric label="Training" value={summary?.attendancePct} suffix="%" />
    <Metric label="Einsatz" value={summary?.effort} suffix="/100" />
    <Metric label="Ausführung" value={summary?.execution} suffix="/100" />
    <Metric label="Disziplin" value={summary?.discipline} suffix="/100" />
    <Metric label="Game Impact" value={summary?.impact} suffix="/100" />
   </div>
   <div className="perf-grid">
    <AdminCard className="perf-chart-card"><div className="cms-section-head"><div><small>ENTWICKLUNG</small><h2>Performance Trend</h2></div><span className="cms-muted">Letzte {trend.length} Bewertungen</span></div><TrendChart data={trend}/></AdminCard>
    <AdminCard><div className="cms-section-head"><div><small>SAISONSTATS</small><h2>On-Field Output</h2></div></div><div className="perf-stat-grid">{stats.length?stats.map(s=><div key={s.key}><strong>{s.value}</strong><span>{statLabels[s.key]??s.key.replaceAll("_"," ")}</span></div>):<p className="cms-muted">Noch keine Spielstatistiken vorhanden.</p>}</div></AdminCard>
   </div>
   <AdminCard><div className="cms-section-head"><div><small>COACH INPUT</small><h2>Bewertung erfassen</h2></div><span className="cms-muted">1 = niedrig · 5 = sehr stark</span></div><div className="perf-entry-form">
    <label className="cms-field"><span>Typ</span><select value={context} onChange={e=>setContext(e.target.value as typeof context)}><option value="training">Training</option><option value="game">Spiel</option><option value="review">Coach Review</option></select></label>
    <label className="cms-field"><span>Datum</span><input type="date" value={occurredAt} onChange={e=>setOccurredAt(e.target.value)}/></label>
    {context==="training"&&<label className="cms-field"><span>Teilnahme</span><select value={attendance} onChange={e=>setAttendance(e.target.value)}><option value="present">Anwesend</option><option value="excused">Entschuldigt</option><option value="absent">Unentschuldigt</option><option value="injured">Verletzt</option></select></label>}
    <Score label="Einsatz" value={effort} set={setEffort}/><Score label="Ausführung" value={execution} set={setExecution}/><Score label="Disziplin" value={discipline} set={setDiscipline}/><Score label="Impact" value={impact} set={setImpact}/>
    <label className="cms-field"><span>Gesamtnote (optional)</span><select value={overall} onChange={e=>setOverall(Number(e.target.value))}><option value={0}>Automatisch berechnen</option>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
    <label className="cms-field perf-note"><span>Coach-Notiz</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="z. B. sehr gute Reads, Technik unter Druck noch unsauber"/></label>
    <button className="cms-button" disabled={saving} onClick={()=>void addEntry()}>{saving?"Speichert…":"Bewertung speichern"}</button>
   </div></AdminCard>
   <AdminCard><div className="cms-section-head"><div><small>VERLAUF</small><h2>Coach Bewertungen</h2></div><span className="cms-muted">{entries.length} Einträge</span></div><div className="perf-history">{entries.map(e=><article key={e.id}><div><b>{contextLabel(e.context)}</b><span>{new Date(e.occurredAt).toLocaleDateString("de-DE")}{e.context==="training"?` · ${attendanceLabel(e.attendance)}`:""}</span></div><div className="perf-mini-scores"><span>E {to100(e.effort)}</span><span>A {to100(e.execution)}</span><span>D {to100(e.discipline)}</span><span>I {to100(e.impact)}</span></div><p>{e.note||"Keine Notiz"}</p><button onClick={()=>void removeEntry(e.id)}>Löschen</button></article>)}{!entries.length&&<p className="cms-muted">Noch keine Performance-Bewertungen vorhanden.</p>}</div></AdminCard>
  </>}
 </AdminShell>
}
function Metric({label,value,suffix,strong=false}:{label:string;value:number|null|undefined;suffix:string;strong?:boolean}){return <div className={`perf-metric ${strong?"strong":""}`}><small>{label}</small><strong>{value??"–"}<i>{value==null?"":suffix}</i></strong></div>}
function Score({label,value,set}:{label:string;value:number;set:(v:number)=>void}){return <label className="cms-field"><span>{label}</span><select value={value} onChange={e=>set(Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}
function to100(v:number|null){return v==null?"–":Math.round(v*20)}
function contextLabel(v:string){return v==="training"?"TRAINING":v==="game"?"SPIEL":"COACH REVIEW"}
function attendanceLabel(v:string){return ({present:"Anwesend",excused:"Entschuldigt",absent:"Unentschuldigt",injured:"Verletzt"} as Record<string,string>)[v]??"–"}
function TrendChart({data}:{data:Trend[]}){if(data.length<2)return <div className="perf-chart-empty">Mindestens zwei Bewertungen für eine Trendlinie erfassen.</div>;const vals=data.map(d=>d.index??0);const min=Math.min(...vals,40),max=Math.max(...vals,100);const w=700,h=220,p=22;const points=data.map((d,i)=>{const x=p+(i*(w-2*p))/Math.max(1,data.length-1);const y=h-p-(((d.index??0)-min)/Math.max(1,max-min))*(h-2*p);return `${x},${y}`}).join(" ");return <div className="perf-chart-wrap"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Performance Trend"><line x1={p} y1={h-p} x2={w-p} y2={h-p}/><line x1={p} y1={p} x2={p} y2={h-p}/><polyline points={points}/>{data.map((d,i)=>{const [x,y]=points.split(" ")[i].split(",");return <g key={d.id}><circle cx={x} cy={y} r="5"/><text x={x} y={Number(y)-10} textAnchor="middle">{d.index}</text></g>})}</svg><div className="perf-chart-labels">{data.map(d=><span key={d.id}>{new Date(d.date).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"})}</span>)}</div></div>}
