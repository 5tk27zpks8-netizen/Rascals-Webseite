"use client";

import { useEffect,useMemo,useState } from "react";
import { AdminCard,AdminNotice,AdminShell } from "../../_components/AdminShell";
import "./training-analytics.css";

type Season={id:string;year:number;name:string;isCurrent:boolean};
type Monthly={month:string;sessions:number;minutes:number;attendancePct:number|null;executionAvg:number|null;intensityAvg:number|null};
type Effect={skillKey:string;skillLabel:string;group:string;category:string;minutes:number;sessions:number;evaluatedPlayers:number;skillDelta:number|null;effectivenessPer60:number|null};
type Payload={seasons:Season[];season:Season;summary:{sessionsPlanned:number;sessionsCompleted:number;totalMinutes:number;dataDrivenMinutes:number;dataDrivenSharePct:number;avgCompletionPct:number|null;avgExecution:number|null;avgIntensity:number|null};monthly:Monthly[];byGroup:Array<{group:string;minutes:number;sessions:number}>;byUnit:Array<{label:string;minutes:number}>;effectiveness:Effect[]};

export function TrainingAnalyticsManager(){
 const[data,setData]=useState<Payload|null>(null),[seasonId,setSeasonId]=useState(""),[fromMonth,setFromMonth]=useState(""),[toMonth,setToMonth]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{void load()},[]);
 async function load(id?:string){setLoading(true);setNotice("");try{const p=new URLSearchParams();if(id)p.set("seasonId",id);const r=await fetch(`/admin/api/training-analytics?${p}`);if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error||"Training Analytics konnten nicht geladen werden.")}const b=await r.json() as Payload;setData(b);setSeasonId(b.season.id)}catch(e){setNotice(e instanceof Error?e.message:"Fehler beim Laden.")}finally{setLoading(false)}}
 const monthly=useMemo(()=>data?.monthly.filter(m=>(!fromMonth||m.month>=fromMonth)&&(!toMonth||m.month<=toMonth))??[],[data,fromMonth,toMonth]);
 const maxMonthly=Math.max(1,...monthly.map(m=>m.minutes));const maxGroup=Math.max(1,...(data?.byGroup.map(x=>x.minutes)??[1]));
 return <AdminShell active="trainingops" title="Training Analytics" eyebrow="RASCALS OS · LOAD & EFFECTIVENESS" actions={<a className="cms-button secondary" href="/admin/training-operations">← Training Operations</a>}>
  {notice&&<AdminNotice tone="error">{notice}</AdminNotice>}
  <AdminCard className="ta-head"><div><small>PERFORMANCE LOOP ANALYTICS</small><h2>Trainingszeit gegen Entwicklung und Ausführung messen.</h2><p>Die Auswertung verbindet abgeschlossene Trainingseinheiten, Development-basierte Periods, Attendance, Session Reviews und Skill-Evaluationen.</p></div><div className="ta-filters"><label><span>Saison</span><select value={seasonId} onChange={e=>{setSeasonId(e.target.value);void load(e.target.value)}}>{data?.seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label><span>Von Monat</span><input type="month" value={fromMonth} onChange={e=>setFromMonth(e.target.value)}/></label><label><span>Bis Monat</span><input type="month" value={toMonth} onChange={e=>setToMonth(e.target.value)}/></label></div></AdminCard>
  {loading?<AdminCard>Analytics werden geladen…</AdminCard>:data&&<>
   <div className="ta-kpis"><Metric label="COMPLETED" value={data.summary.sessionsCompleted}/><Metric label="TRAINING MIN" value={data.summary.totalMinutes}/><Metric label="DATA-DRIVEN" value={`${data.summary.dataDrivenSharePct}%`}/><Metric label="COMPLETION" value={data.summary.avgCompletionPct==null?"—":`${data.summary.avgCompletionPct}%`}/><Metric label="EXECUTION" value={data.summary.avgExecution??"—"}/><Metric label="INTENSITY" value={data.summary.avgIntensity??"—"}/></div>

   <div className="ta-grid-2"><AdminCard><div className="cms-section-head"><div><small>TIME TREND</small><h2>Monatliche Trainingslast</h2></div></div>{!monthly.length?<p className="cms-muted">Für den gewählten Zeitraum liegen noch keine abgeschlossenen Trainingsdaten vor.</p>:<div className="ta-months">{monthly.map(m=><article key={m.month}><div><b>{monthLabel(m.month)}</b><small>{m.sessions} Sessions · Attendance {m.attendancePct==null?"—":`${m.attendancePct}%`}</small></div><div className="ta-bar"><i style={{width:`${Math.round(m.minutes/maxMonthly*100)}%`}}/></div><strong>{m.minutes} min</strong><em>Exec {m.executionAvg??"—"} · Int {m.intensityAvg??"—"}</em></article>)}</div>}</AdminCard>

   <AdminCard><div className="cms-section-head"><div><small>LOAD DISTRIBUTION</small><h2>Trainingszeit nach Positionsgruppe</h2></div></div><div className="ta-groups">{data.byGroup.map(g=><article key={g.group}><div><b>{g.group}</b><small>{g.sessions} Sessions</small></div><div className="ta-bar"><i style={{width:`${Math.round(g.minutes/maxGroup*100)}%`}}/></div><strong>{g.minutes} min</strong></article>)}</div></AdminCard></div>

   <AdminCard><div className="cms-section-head"><div><small>TRAINING EFFECTIVENESS</small><h2>Skill Exposure vs. Skillentwicklung</h2></div></div><p className="cms-muted">Die Kennzahl zeigt Korrelation, keine automatische Kausalität: mehr Trainingsminuten bedeuten nicht zwingend, dass genau diese Period die Verbesserung verursacht hat.</p><div className="ta-effect-table"><div className="head"><span>Skill</span><span>Gruppe</span><span>Minuten</span><span>Sessions</span><span>Spieler</span><span>Skill Δ</span><span>Δ / 60 Min</span></div>{data.effectiveness.map(e=><div key={e.skillKey}><span><b>{e.skillLabel}</b><small>{e.category}</small></span><span>{e.group}</span><span>{e.minutes}</span><span>{e.sessions}</span><span>{e.evaluatedPlayers}</span><span className={deltaClass(e.skillDelta)}>{formatDelta(e.skillDelta)}</span><span className={deltaClass(e.effectivenessPer60)}>{formatDelta(e.effectivenessPer60)}</span></div>)}</div></AdminCard>

   <AdminCard><div className="cms-section-head"><div><small>INTERPRETATION</small><h2>Coach Decision Layer</h2></div></div><div className="ta-insights"><Insight title="High Load + Positive Trend" text="Beibehalten und Progression erhöhen. Der Skill reagiert aktuell positiv auf den Trainingsfokus."/><Insight title="High Load + Flat/Negative Trend" text="Drill-Auswahl, Coaching Points, Reps-Qualität oder Teaching Progression prüfen – nicht einfach noch mehr Minuten hinzufügen."/><Insight title="Low Load + High Need" text="Potenzielle Unterversorgung. In der nächsten Planungsrunde höher priorisieren, sofern Evaluation Coverage belastbar ist."/><Insight title="Low Data" text="Keine harte Trainingsempfehlung ableiten. Erst Evaluationen und Attendance-Daten vervollständigen."/></div></AdminCard>
  </>}
 </AdminShell>
}
function Metric({label,value}:{label:string;value:string|number}){return <article className="ta-metric"><small>{label}</small><b>{value}</b></article>}
function Insight({title,text}:{title:string;text:string}){return <article><b>{title}</b><p>{text}</p></article>}
function monthLabel(value:string){if(!/^\d{4}-\d{2}$/.test(value))return value;const[y,m]=value.split("-").map(Number);return new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))}
function formatDelta(v:number|null){if(v==null)return"—";return `${v>0?"+":""}${v.toFixed(1)}`}
function deltaClass(v:number|null){return v==null?"neutral":v>0?"positive":v<0?"negative":"neutral"}