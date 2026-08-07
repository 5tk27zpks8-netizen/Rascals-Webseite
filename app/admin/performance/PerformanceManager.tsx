"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./performance.css";

type Player = { id:string; firstName:string; lastName:string; jerseyNumber:number|null; position:string; unit:string };
type Entry = { id:string; playerId:string; context:"training"|"game"|"review"; occurredAt:string; attendance:string; effort:number|null; execution:number|null; discipline:number|null; impact:number|null; overall:number|null; note:string; createdBy:string; };
type Summary = { attendancePct:number|null; effort:number|null; execution:number|null; discipline:number|null; impact:number|null; overall:number|null; trainingCount:number; gameReviews:number; totalEntries:number; };
type Trend = { id:string; date:string; context:string; index:number|null };
type Monthly = { period:string; label:string; overall:number|null; attendancePct:number|null; effort:number|null; execution:number|null; discipline:number|null; impact:number|null; entries:number };
type Stat = { key:string; value:number };

type PeriodMode = "all"|"year"|"month"|"custom";

const statLabels:Record<string,string>={touchdowns:"TD",interceptions:"INT",sacks:"Sacks",tackles:"Tackles",forced_fumbles:"FF",receiving_td:"Rec TD",rushing_td:"Rush TD",passing_td:"Pass TD",field_goals:"FG"};
const months=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

export function PerformanceManager(){
 const[players,setPlayers]=useState<Player[]>([]); const[playerId,setPlayerId]=useState(""); const[entries,setEntries]=useState<Entry[]>([]); const[summary,setSummary]=useState<Summary|null>(null); const[trend,setTrend]=useState<Trend[]>([]); const[monthly,setMonthly]=useState<Monthly[]>([]); const[stats,setStats]=useState<Stat[]>([]); const[notice,setNotice]=useState(""); const[saving,setSaving]=useState(false); const[years,setYears]=useState<number[]>([]);
 const[periodMode,setPeriodMode]=useState<PeriodMode>("year"); const[selectedYear,setSelectedYear]=useState(new Date().getFullYear()); const[selectedMonth,setSelectedMonth]=useState(new Date().getMonth()+1); const[customFrom,setCustomFrom]=useState(""); const[customTo,setCustomTo]=useState(""); const[contextFilter,setContextFilter]=useState("all");
 const[context,setContext]=useState<"training"|"game"|"review">("training"); const[occurredAt,setOccurredAt]=useState(()=>new Date().toISOString().slice(0,10)); const[attendance,setAttendance]=useState("present"); const[effort,setEffort]=useState(4); const[execution,setExecution]=useState(4); const[discipline,setDiscipline]=useState(4); const[impact,setImpact]=useState(4); const[overall,setOverall]=useState(0); const[note,setNote]=useState("");
 const player=useMemo(()=>players.find(p=>p.id===playerId)??null,[players,playerId]);
 const range=useMemo(()=>resolveRange(periodMode,selectedYear,selectedMonth,customFrom,customTo),[periodMode,selectedYear,selectedMonth,customFrom,customTo]);
 useEffect(()=>{void loadBase()},[]);
 useEffect(()=>{if(playerId)void loadPlayer(playerId)},[playerId,range.from,range.to,contextFilter]);
 async function loadBase(){const r=await fetch("/admin/api/performance"); if(!r.ok)return setNotice("Performance-Daten konnten nicht geladen werden."); const b=await r.json() as {players:Player[];years:number[]}; setPlayers(b.players);setYears(b.years??[]);const fallback=b.years?.[0]??new Date().getFullYear();setSelectedYear(fallback);setPlayerId(b.players[0]?.id??"")}
 async function loadPlayer(id:string){const params=new URLSearchParams({playerId:id,context:contextFilter});if(range.from)params.set("from",range.from);if(range.to)params.set("to",range.to);const r=await fetch(`/admin/api/performance?${params.toString()}`); if(!r.ok)return setNotice("Spielerdaten konnten nicht geladen werden."); const b=await r.json() as {entries:Entry[];summary:Summary;trend:Trend[];monthly:Monthly[];stats:Stat[];years:number[]}; setEntries(b.entries);setSummary(b.summary);setTrend(b.trend);setMonthly(b.monthly??[]);setStats(b.stats);if(b.years?.length)setYears(b.years)}
 async function addEntry(){if(!playerId)return;setSaving(true);setNotice("");try{const r=await fetch("/admin/api/performance",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({playerId,context,occurredAt,attendance:context==="training"?attendance:"none",effort,execution,discipline,impact,overall:overall||null,note})});if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error??"Speichern fehlgeschlagen.")}setNote("");setNotice("Performance-Eintrag gespeichert.");await loadPlayer(playerId)}catch(e){setNotice(e instanceof Error?e.message:"Speichern fehlgeschlagen.")}finally{setSaving(false)}}
 async function removeEntry(id:string){if(!confirm("Eintrag wirklich löschen?"))return;const r=await fetch(`/admin/api/performance?id=${encodeURIComponent(id)}`,{method:"DELETE"});if(!r.ok)return setNotice("Eintrag konnte nicht gelöscht werden.");setNotice("Eintrag gelöscht.");await loadPlayer(playerId)}
 return <AdminShell active="performance" title="Player Performance" eyebrow="RASCALS OS · FOOTBALL ANALYTICS">
  {notice&&<AdminNotice tone={notice.includes("gespeichert")||notice.includes("gelöscht")?"success":"error"}>{notice}</AdminNotice>}
  <AdminCard><div className="perf-head"><div><small>SPIELERANALYSE</small><h2>Entwicklung über Monate & Jahre</h2><p>Power-BI-ähnliche Zeitfilter für Trainingsbeteiligung, Coach Ratings und On-Field Performance. Alle Kennzahlen reagieren auf den gewählten Zeitraum.</p></div><label className="cms-field perf-player-select"><span>Spieler</span><select value={playerId} onChange={e=>setPlayerId(e.target.value)}>{players.map(p=><option key={p.id} value={p.id}>#{p.jerseyNumber??"–"} {p.firstName} {p.lastName} · {p.position}</option>)}</select></label></div></AdminCard>
  {player&&<>
   <AdminCard className="perf-filter-card">
    <div className="perf-filter-head"><div><small>ZEITANALYSE</small><h2>Analysezeitraum</h2></div><strong>{range.label}</strong></div>
    <div className="perf-filter-grid">
      <label className="cms-field"><span>Zeitraum</span><select value={periodMode} onChange={e=>setPeriodMode(e.target.value as PeriodMode)}><option value="all">Alle Jahre</option><option value="year">Jahr</option><option value="month">Monat</option><option value="custom">Benutzerdefiniert</option></select></label>
      {(periodMode==="year"||periodMode==="month")&&<label className="cms-field"><span>Jahr</span><select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}>{yearOptions(years).map(y=><option key={y} value={y}>{y}</option>)}</select></label>}
      {periodMode==="month"&&<label className="cms-field"><span>Monat</span><select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}>{months.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></label>}
      {periodMode==="custom"&&<><label className="cms-field"><span>Von</span><input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}/></label><label className="cms-field"><span>Bis</span><input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}/></label></>}
      <label className="cms-field"><span>Quelle</span><select value={contextFilter} onChange={e=>setContextFilter(e.target.value)}><option value="all">Alle Bewertungen</option><option value="training">Nur Training</option><option value="game">Nur Spiele</option><option value="review">Nur Coach Reviews</option></select></label>
    </div>
    <div className="perf-quick-periods"><button onClick={()=>{setPeriodMode("year");setSelectedYear(new Date().getFullYear())}}>Dieses Jahr</button><button onClick={()=>{const d=new Date();setPeriodMode("month");setSelectedYear(d.getFullYear());setSelectedMonth(d.getMonth()+1)}}>Dieser Monat</button><button onClick={()=>setPeriodMode("all")}>Gesamte Karriere</button></div>
   </AdminCard>

   <div className="perf-kpis">
    <Metric label="Performance Index" value={summary?.overall} suffix="/100" strong />
    <Metric label="Training" value={summary?.attendancePct} suffix="%" />
    <Metric label="Einsatz" value={summary?.effort} suffix="/100" />
    <Metric label="Ausführung" value={summary?.execution} suffix="/100" />
    <Metric label="Disziplin" value={summary?.discipline} suffix="/100" />
    <Metric label="Game Impact" value={summary?.impact} suffix="/100" />
   </div>

   <AdminCard className="perf-chart-card perf-chart-wide"><div className="cms-section-head"><div><small>LANGZEITENTWICKLUNG</small><h2>Monats-Trend</h2></div><span className="cms-muted">{monthly.length} Zeitperioden · {summary?.totalEntries??0} Bewertungen</span></div><MonthlyTrendChart data={monthly}/></AdminCard>

   <div className="perf-grid">
    <AdminCard className="perf-chart-card"><div className="cms-section-head"><div><small>DETAILTREND</small><h2>Einzelbewertungen</h2></div><span className="cms-muted">Bis zu {trend.length} Punkte</span></div><TrendChart data={trend}/></AdminCard>
    <AdminCard><div className="cms-section-head"><div><small>ZEITRAUM-STATS</small><h2>On-Field Output</h2></div></div><div className="perf-stat-grid">{stats.length?stats.map(s=><div key={s.key}><strong>{s.value}</strong><span>{statLabels[s.key]??s.key.replaceAll("_"," ")}</span></div>):<p className="cms-muted">Keine Spielstatistiken im gewählten Zeitraum.</p>}</div></AdminCard>
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

   <AdminCard><div className="cms-section-head"><div><small>VERLAUF</small><h2>Coach Bewertungen</h2></div><span className="cms-muted">{entries.length} Einträge im Filter</span></div><div className="perf-history">{entries.map(e=><article key={e.id}><div><b>{contextLabel(e.context)}</b><span>{new Date(e.occurredAt).toLocaleDateString("de-DE")}{e.context==="training"?` · ${attendanceLabel(e.attendance)}`:""}</span></div><div className="perf-mini-scores"><span>E {to100(e.effort)}</span><span>A {to100(e.execution)}</span><span>D {to100(e.discipline)}</span><span>I {to100(e.impact)}</span></div><p>{e.note||"Keine Notiz"}</p><button onClick={()=>void removeEntry(e.id)}>Löschen</button></article>)}{!entries.length&&<p className="cms-muted">Keine Performance-Bewertungen im gewählten Zeitraum.</p>}</div></AdminCard>
  </>}
 </AdminShell>
}

function resolveRange(mode:PeriodMode,year:number,month:number,from:string,to:string){if(mode==="all")return{from:"",to:"",label:"Gesamte Karriere"};if(mode==="year")return{from:`${year}-01-01`,to:`${year}-12-31`,label:`Jahr ${year}`};if(mode==="month"){const last=new Date(year,month,0).getDate();return{from:`${year}-${String(month).padStart(2,"0")}-01`,to:`${year}-${String(month).padStart(2,"0")}-${last}`,label:`${months[month-1]} ${year}`}}return{from,to,label:from||to?`${from||"…"} bis ${to||"…"}`:"Benutzerdefiniert"}}
function yearOptions(years:number[]){const now=new Date().getFullYear();return [...new Set([now,...years])].sort((a,b)=>b-a)}
function Metric({label,value,suffix,strong=false}:{label:string;value:number|null|undefined;suffix:string;strong?:boolean}){return <div className={`perf-metric ${strong?"strong":""}`}><small>{label}</small><strong>{value??"–"}<i>{value==null?"":suffix}</i></strong></div>}
function Score({label,value,set}:{label:string;value:number;set:(v:number)=>void}){return <label className="cms-field"><span>{label}</span><select value={value} onChange={e=>set(Number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}
function to100(v:number|null){return v==null?"–":Math.round(v*20)}
function contextLabel(v:string){return v==="training"?"TRAINING":v==="game"?"SPIEL":"COACH REVIEW"}
function attendanceLabel(v:string){return ({present:"Anwesend",excused:"Entschuldigt",absent:"Unentschuldigt",injured:"Verletzt"} as Record<string,string>)[v]??"–"}
function TrendChart({data}:{data:Trend[]}){if(data.length<2)return <div className="perf-chart-empty">Mindestens zwei Bewertungen im gewählten Zeitraum erforderlich.</div>;const vals=data.map(d=>d.index??0);const min=Math.min(...vals,40),max=Math.max(...vals,100);const w=700,h=220,p=22;const coords=data.map((d,i)=>({x:p+(i*(w-2*p))/Math.max(1,data.length-1),y:h-p-(((d.index??0)-min)/Math.max(1,max-min))*(h-2*p)}));const points=coords.map(c=>`${c.x},${c.y}`).join(" ");return <div className="perf-chart-wrap"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Performance Trend"><line x1={p} y1={h-p} x2={w-p} y2={h-p}/><line x1={p} y1={p} x2={p} y2={h-p}/><polyline points={points}/>{data.map((d,i)=><g key={d.id}><circle cx={coords[i].x} cy={coords[i].y} r="5"/><text x={coords[i].x} y={coords[i].y-10} textAnchor="middle">{d.index}</text></g>)}</svg><div className="perf-chart-labels">{data.map(d=><span key={d.id}>{new Date(d.date).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"2-digit"})}</span>)}</div></div>}
function MonthlyTrendChart({data}:{data:Monthly[]}){if(data.length<2)return <div className="perf-chart-empty">Für eine Langzeitkurve werden Daten aus mindestens zwei Monaten benötigt.</div>;const w=980,h=300,p=34;const series=[{key:"overall",label:"Performance"},{key:"attendancePct",label:"Training"},{key:"effort",label:"Einsatz"},{key:"execution",label:"Ausführung"}] as const;const x=(i:number)=>p+(i*(w-2*p))/Math.max(1,data.length-1);const y=(value:number)=>h-p-(value/100)*(h-2*p);return <div className="perf-monthly-chart"><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Monatliche Performance Entwicklung">{[0,25,50,75,100].map(v=><g key={v}><line x1={p} y1={y(v)} x2={w-p} y2={y(v)}/><text x={6} y={y(v)+4}>{v}</text></g>)}{series.map((s,si)=>{const valid=data.map((d,i)=>({i,v:d[s.key]})).filter((x):x is {i:number;v:number}=>x.v!=null);const pts=valid.map(v=>`${x(v.i)},${y(v.v)}`).join(" ");return <g key={s.key} className={`monthly-series series-${si}`}><polyline points={pts}/>{valid.map(v=><circle key={`${s.key}-${v.i}`} cx={x(v.i)} cy={y(v.v)} r="4"/>)}</g>})}</svg><div className="perf-monthly-labels">{data.map(d=><span key={d.period}>{d.label}</span>)}</div><div className="perf-chart-legend">{series.map((s,i)=><span key={s.key} className={`legend-${i}`}><i/> {s.label}</span>)}</div></div>}
