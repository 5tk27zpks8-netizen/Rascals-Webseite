"use client";
import {useRef} from "react";
import {AdminCard} from "../_components/AdminShell";
import {routePath,type CustomRoute,type Depth,type Formation,type OpponentDiagramPlayer,type OpponentDiagramRoute,type RouteDraft,type Slot} from "./playbook-studio-model";

type Row={slot:Slot;starter:Depth|null;backup:Depth|null};

export function PlaybookField({formation,rows,routes,customRoutes,selected,onSelect,draggable=false,lineOfScrimmageY,onMove}:{formation:Formation|null;rows:Row[];routes:RouteDraft[];customRoutes:CustomRoute[];selected:string;onSelect:(id:string)=>void;draggable?:boolean;lineOfScrimmageY?:number;onMove?:(slotKey:string,x:number,y:number)=>void}){
 const ref=useRef<HTMLDivElement|null>(null),drag=useRef<string|null>(null);
 function point(e:React.PointerEvent){const r=ref.current?.getBoundingClientRect();if(!r)return null;return{x:Math.max(2,Math.min(98,(e.clientX-r.left)/r.width*100)),y:Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100))}}
 return <AdminCard className="pbs-field-card"><div className="cms-section-head"><div><small>FOOTBALL FIELD</small><h2>{formation?.name||"Formation wählen"}</h2></div><span className="cms-muted">{draggable?"Marker ziehen · Routes live":"Starter + Backup + Rating"}</span></div><div ref={ref} className="pbs-field" onPointerMove={e=>{if(!drag.current||!onMove)return;const p=point(e);if(p)onMove(drag.current,+p.x.toFixed(1),+p.y.toFixed(1))}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
  <div className="pbs-endzone top">RASCALS</div><div className="pbs-endzone bottom">RASCALS</div>
  {[10,20,30,40,50,60,70,80,90].map(n=><span className="pbs-yard" key={n} style={{top:`${n}%`}}><b>{n<=50?n:100-n}</b></span>)}<span className="pbs-hash left"/><span className="pbs-hash right"/>{lineOfScrimmageY!=null&&<span className="pbs-los" style={{top:`${lineOfScrimmageY}%`}}/>}
  {rows.map(x=><button className={`pbs-marker ${selected===x.slot.slotKey?"selected":""}`} style={{left:`${x.slot.x}%`,top:`${x.slot.y}%`}} key={x.slot.id} onPointerDown={e=>{if(!draggable)return;e.preventDefault();drag.current=x.slot.slotKey;e.currentTarget.setPointerCapture(e.pointerId);onSelect(x.slot.slotKey)}} onClick={()=>onSelect(x.slot.slotKey)}><b>{x.slot.positionLabel}</b><span>{x.starter?`#${x.starter.jerseyNumber??"–"} ${x.starter.lastName}`:"OPEN"}</span><small>{x.backup?`B #${x.backup.jerseyNumber??"–"}`:"NO B"}</small></button>)}
  {routes.map(r=>{const slot=formation?.slots.find(s=>s.slotKey===r.slotKey);if(!slot)return null;const pts=routePath(slot,r,customRoutes);if(pts.length<2)return null;return <svg className="pbs-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" key={r.slotKey}><path d={pts.map((p,i)=>`${i?"L":"M"} ${p.x} ${p.y}`).join(" ")}/></svg>})}
 </div></AdminCard>
}

export function ScoutField({players,routes,customRoutes,onMove}:{players:OpponentDiagramPlayer[];routes:OpponentDiagramRoute[];customRoutes:CustomRoute[];onMove:(label:string,x:number,y:number)=>void}){
 const ref=useRef<HTMLDivElement|null>(null),drag=useRef<string|null>(null);
 function point(e:React.PointerEvent){const r=ref.current?.getBoundingClientRect();if(!r)return null;return{x:Math.max(2,Math.min(98,(e.clientX-r.left)/r.width*100)),y:Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100))}}
 return <div ref={ref} className="pbs-scout-field" onPointerMove={e=>{if(!drag.current)return;const p=point(e);if(p)onMove(drag.current,+p.x.toFixed(1),+p.y.toFixed(1))}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
  <div className="pbs-scout-endzone">SCOUT</div>{[18,34,50,66,82].map(y=><span className="pbs-scout-yard" style={{top:`${y}%`}} key={y}/>)}
  {players.map(p=><button key={p.id} style={{left:`${p.x}%`,top:`${p.y}%`}} onPointerDown={e=>{drag.current=p.label;e.currentTarget.setPointerCapture(e.pointerId)}}>{p.label}</button>)}
  {routes.map(r=>{const p=players.find(x=>x.label===r.target);if(!p)return null;const pts=routePath({x:p.x,y:p.y},r,customRoutes);if(pts.length<2)return null;return <svg className="pbs-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" key={r.id}><path d={pts.map((x,i)=>`${i?"L":"M"} ${x.x} ${x.y}`).join(" ")}/></svg>})}
 </div>
}
