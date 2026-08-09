"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import { LineupFootballField, LineupUnit, LineupDepthEntry } from "../team-management/_components/LineupFootballField";
import "./field-lab.css";

type Season={id:string;name:string;isCurrent:boolean};
type Depth=LineupDepthEntry&{positionGroup:string};
type Perf={playerId:string;rating:number|null;target:number|null;confidence:number|null;evaluations:number};
type Payload={seasons:Season[];season:Season;depth:Depth[];performance:Perf[];summary:{gameReadyPct:number;gameReady:number;roster:number}};

function unitFor(group:string,position:string):LineupUnit{
  const s=`${group} ${position}`.toUpperCase();
  if(/QB|RB|HB|FB|WR|TE|LT|LG|CENTER|\bC\b|RG|RT|\bOL\b/.test(s)) return "offense";
  if(/KICK|PUNT|RETURN|\bST\b|\bK\b|\bP\b|LS|KR|PR/.test(s)) return "special-teams";
  return "defense";
}
function groupDepth(rows:Depth[]){const out:Record<string,Depth[]>={};for(const r of rows){(out[r.position]??=[]).push(r);out[r.position].sort((a,b)=>a.rank-b.rank)}return out}
function avg(v:Array<number|null|undefined>){const n=v.filter((x):x is number=>typeof x==="number"&&Number.isFinite(x));return n.length?n.reduce((a,b)=>a+b,0)/n.length:null}
function fmt(v:number|null){return v==null?"—":v.toFixed(1)}

export function FieldLab(){
  const[data,setData]=useState<Payload|null>(null),[unit,setUnit]=useState<LineupUnit>("offense"),[selected,setSelected]=useState(""),[notice,setNotice]=useState("");
  useEffect(()=>{void load()},[]);
  async function load(){try{const r=await fetch("/admin/api/team-management");if(!r.ok)throw new Error("Live-Daten konnten nicht geladen werden.");setData(await r.json())}catch(e){setNotice(e instanceof Error?e.message:"Fehler")}}
  const positions=useMemo(()=>Object.entries(groupDepth((data?.depth??[]).filter(d=>unitFor(d.positionGroup,d.position)===unit))),[data,unit]);
  useEffect(()=>{if(positions.length&&!positions.some(([p])=>p===selected))setSelected(positions[0][0])},[positions,selected]);
  const getRating=(id?:string)=>id?data?.performance.find(p=>p.playerId===id)?.rating??null:null;
  const starters=positions.map(([,es])=>es.find(e=>e.rank===1)??es[0]).filter(Boolean);
  const unitRating=avg(starters.map(s=>getRating(s?.playerId)));
  const current=positions.find(([p])=>p===selected)?.[1]??[];

  return <AdminShell active="teammanagement" title="Field Lab" eyebrow="RASCALS OS · ISOLIERTE FELDENTWICKLUNG">
    {notice&&<AdminNotice tone="error">{notice}</AdminNotice>}
    <div className="fl-shell">
      <header className="fl-header"><div><small>ISOLATED COMPONENT</small><h2>Professional Football Field</h2><p>Dieser Bereich ist bewusst vom produktiven Team-&-Kader-Screen getrennt. Hier optimieren wir nur Feld, Perspektive, Aufstellung und Positionsdarstellung.</p></div><a className="cms-button secondary" href="/admin/team-management?tab=depth">Zur aktuellen Aufstellung</a></header>
      <div className="fl-tabs">{(["offense","defense","special-teams"]as LineupUnit[]).map(u=><button key={u} className={unit===u?"active":""} onClick={()=>setUnit(u)}>{u==="offense"?"Offense":u==="defense"?"Defense":"Special Teams"}</button>)}</div>
      <div className="fl-kpis"><Stat label="UNIT RATING" value={fmt(unitRating)}/><Stat label="POSITIONS" value={String(positions.length)}/><Stat label="GAME READY" value={data?`${data.summary.gameReadyPct}%`:"—"}/><Stat label="SELECTED" value={selected||"—"}/></div>
      <div className="fl-layout"><main><LineupFootballField unit={unit} positions={positions} selectedPosition={selected} onSelectPosition={setSelected} getRating={getRating}/></main><aside className="fl-side"><small>POSITIONS-PERFORMANCE</small><h3>{selected||"Position wählen"}</h3>{current.map(e=>{const p=data?.performance.find(x=>x.playerId===e.playerId);return <article key={`${e.playerId}-${e.rank}`}><div><span>{e.rank===1?"Starter":"Backup"}</span><b>#{e.jerseyNumber??"–"} {e.firstName} {e.lastName}</b></div><strong>{fmt(p?.rating??null)}</strong><footer><span>Ziel {fmt(p?.target??null)}</span><span>Confidence {p?.confidence??0}%</span><span>Evals {p?.evaluations??0}</span></footer></article>})}</aside></div>
    </div>
  </AdminShell>
}
function Stat({label,value}:{label:string;value:string}){return <div><small>{label}</small><strong>{value}</strong></div>}
