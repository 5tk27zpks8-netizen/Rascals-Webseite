"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";

type TrashItem={type:"news"|"sponsor"|"player"|"game"|"coach";id:string;title:string;subtitle:string;deletedAt:string;deletedBy:string};

const labels:Record<TrashItem["type"],string>={news:"News",sponsor:"Sponsor",player:"Spieler",game:"Spiel",coach:"Coach"};

export function TrashManager(){
 const[items,setItems]=useState<TrashItem[]>([]);const[query,setQuery]=useState("");const[notice,setNotice]=useState("");const[loading,setLoading]=useState(true);const[restoring,setRestoring]=useState("");
 useEffect(()=>{void load()},[]);
 async function load(){setLoading(true);setNotice("");try{const r=await fetch("/admin/api/trash");if(!r.ok)throw new Error("Papierkorb konnte nicht geladen werden.");const b=await r.json() as {items:TrashItem[]};setItems(b.items)}catch(e){setNotice(e instanceof Error?e.message:"Fehler beim Laden.")}finally{setLoading(false)}}
 async function restore(item:TrashItem){setRestoring(`${item.type}:${item.id}`);setNotice("");try{const r=await fetch("/admin/api/trash",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({type:item.type,id:item.id})});if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error??"Wiederherstellen fehlgeschlagen.")}setItems(cur=>cur.filter(x=>!(x.type===item.type&&x.id===item.id)));setNotice(`${labels[item.type]} „${item.title}“ wurde wiederhergestellt.`)}catch(e){setNotice(e instanceof Error?e.message:"Wiederherstellen fehlgeschlagen.")}finally{setRestoring("")}}
 const filtered=useMemo(()=>items.filter(item=>`${item.title} ${item.subtitle} ${labels[item.type]} ${item.deletedBy}`.toLowerCase().includes(query.toLowerCase())),[items,query]);
 return <AdminShell active="trash" title="Papierkorb" eyebrow="RASCALS CMS · SICHERE WIEDERHERSTELLUNG">
  {notice&&<AdminNotice tone={notice.includes("wiederhergestellt")?"success":"error"}>{notice}</AdminNotice>}
  <AdminCard>
   <div className="cms-section-head"><div><small>ARCHIVIERTE INHALTE</small><h2>{items.length} Elemente</h2></div><button className="cms-button secondary" onClick={()=>void load()} disabled={loading}>{loading?"Lädt…":"Aktualisieren"}</button></div>
   <p className="cms-muted">Entfernte Inhalte bleiben hier erhalten und können wiederhergestellt werden. Es erfolgt kein endgültiges Löschen über diese Ansicht.</p>
   <label className="cms-field"><span>Durchsuchen</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, Typ oder Benutzer…"/></label>
   <div style={{display:"grid",gap:"12px",marginTop:"20px"}}>
    {filtered.map(item=><article key={`${item.type}:${item.id}`} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:"16px",alignItems:"center",padding:"16px",border:"1px solid rgba(255,255,255,.1)",borderRadius:"12px"}}>
      <div><small style={{fontWeight:800,letterSpacing:".12em"}}>{labels[item.type].toUpperCase()}</small><h3 style={{margin:"6px 0"}}>{item.title}</h3><p className="cms-muted" style={{margin:0}}>{item.subtitle}{item.deletedAt?` · Entfernt ${formatDate(item.deletedAt)}`:""}{item.deletedBy?` · ${item.deletedBy}`:""}</p></div>
      <button className="cms-button secondary" disabled={restoring===`${item.type}:${item.id}`} onClick={()=>void restore(item)}>{restoring===`${item.type}:${item.id}`?"Stellt wieder her…":"Wiederherstellen"}</button>
    </article>)}
    {!loading&&!filtered.length&&<div className="cms-muted" style={{padding:"24px 0"}}>Keine passenden Elemente im Papierkorb.</div>}
   </div>
  </AdminCard>
 </AdminShell>
}

function formatDate(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?value:new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d)}
