"use client";

import { useEffect, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./coaches.css";

type Coach = { id:string; firstName:string; lastName:string; role:string; photo:string; bio:string; sortOrder:number; active:boolean; };
type MediaItem = { key:string; url:string; originalName?:string };

const empty: Coach = { id:"", firstName:"", lastName:"", role:"", photo:"", bio:"", sortOrder:0, active:true };

export function CoachesManager(){
  const [items,setItems]=useState<Coach[]>([]); const [media,setMedia]=useState<MediaItem[]>([]); const [selected,setSelected]=useState<Coach>(empty);
  const [notice,setNotice]=useState(""); const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false);
  useEffect(()=>{void load()},[]);

  async function load(){
    try{
      const [c,m]=await Promise.all([fetch("/admin/api/coaches"),fetch("/admin/api/media")]);
      if(!c.ok) throw new Error("Coaches konnten nicht geladen werden.");
      const cb=await c.json() as {items:Coach[]}; const mb=m.ok?await m.json() as {items:MediaItem[]}:{items:[]};
      setItems(cb.items); setMedia(mb.items); setSelected(cb.items[0]??empty);
    }catch(e){setNotice(e instanceof Error?e.message:"Fehler beim Laden.")}
  }

  async function uploadPhoto(file:File){
    setUploading(true); setNotice("");
    try{
      const data=new FormData(); data.append("file",file);
      const r=await fetch("/admin/api/media",{method:"POST",body:data});
      if(!r.ok) throw new Error("Foto-Upload fehlgeschlagen.");
      const m=await fetch("/admin/api/media"); const mb=await m.json() as {items:MediaItem[]}; setMedia(mb.items);
      const uploaded=mb.items.find(x=>x.originalName===file.name)??mb.items[0];
      if(uploaded) setSelected(current=>({...current,photo:uploaded.url}));
      setNotice("Coach-Foto hochgeladen und ausgewählt.");
    }catch(e){setNotice(e instanceof Error?e.message:"Upload fehlgeschlagen.")}finally{setUploading(false)}
  }

  async function save(){
    if(!selected.firstName.trim()||!selected.lastName.trim()){setNotice("Bitte Vor- und Nachname eintragen.");return;}
    setSaving(true); setNotice("");
    try{
      const r=await fetch("/admin/api/coaches",{method:selected.id?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(selected)});
      if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error??"Speichern fehlgeschlagen.")}
      const b=await r.json() as {item:Coach}; setSelected(b.item);
      setItems(current=>selected.id?current.map(x=>x.id===b.item.id?b.item:x):[...current,b.item].sort((a,b)=>a.sortOrder-b.sortOrder));
      setNotice("Coach gespeichert.");
    }catch(e){setNotice(e instanceof Error?e.message:"Speichern fehlgeschlagen.")}finally{setSaving(false)}
  }

  async function remove(){
    if(!selected.id||!confirm(`${selected.firstName} ${selected.lastName} wirklich löschen?`))return;
    const r=await fetch(`/admin/api/coaches?id=${encodeURIComponent(selected.id)}`,{method:"DELETE"});
    if(!r.ok){setNotice("Löschen fehlgeschlagen.");return;}
    setItems(current=>current.filter(x=>x.id!==selected.id)); setSelected(empty); setNotice("Coach gelöscht.");
  }

  return <AdminShell active="coaches" title="Coaches" actions={<button className="cms-button" disabled={saving} onClick={()=>void save()}>{saving?"Speichert…":"Coach speichern"}</button>}>
    {notice&&<AdminNotice tone={notice.includes("gespeichert")||notice.includes("hochgeladen")||notice.includes("gelöscht")?"success":"error"}>{notice}</AdminNotice>}
    <div className="coaches-layout">
      <AdminCard>
        <div className="cms-section-head"><div><small>STAFF</small><h2>{items.length} Coaches</h2></div><button className="cms-button secondary" onClick={()=>setSelected(empty)}>＋ Coach</button></div>
        <div className="coaches-list">{items.map(c=><button key={c.id} className={selected.id===c.id?"active":""} onClick={()=>setSelected(c)}>{c.photo?<img src={c.photo} alt=""/>:<span className="coach-avatar">?</span>}<div><b>{c.firstName} {c.lastName}</b><small>{c.role||"Coach"}</small></div></button>)}</div>
      </AdminCard>
      <AdminCard>
        <div className="cms-section-head"><div><small>COACH PROFIL</small><h2>{selected.id?"Bearbeiten":"Neu anlegen"}</h2></div>{selected.id&&<button className="cms-button secondary danger" onClick={()=>void remove()}>Löschen</button>}</div>
        <div className="coach-editor">
          <div className="coach-photo-box">{selected.photo?<img src={selected.photo} alt="Coach Vorschau"/>:<div>KEIN FOTO</div>}</div>
          <div className="coach-photo-actions">
            <label className="cms-button secondary">{uploading?"Upload läuft…":"＋ Foto hochladen"}<input type="file" accept="image/*" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)void uploadPhoto(f);e.currentTarget.value=""}}/></label>
            <select value={selected.photo} onChange={e=>setSelected({...selected,photo:e.target.value})}><option value="">Kein Foto</option>{media.map(m=><option key={m.key} value={m.url}>{m.originalName||m.key.split("/").pop()}</option>)}</select>
          </div>
          <div className="cms-grid-2">
            <label className="cms-field"><span>Vorname</span><input value={selected.firstName} onChange={e=>setSelected({...selected,firstName:e.target.value})}/></label>
            <label className="cms-field"><span>Nachname</span><input value={selected.lastName} onChange={e=>setSelected({...selected,lastName:e.target.value})}/></label>
            <label className="cms-field"><span>Funktion</span><input value={selected.role} onChange={e=>setSelected({...selected,role:e.target.value})} placeholder="z. B. Head Coach"/></label>
            <label className="cms-field"><span>Reihenfolge</span><input type="number" min="0" value={selected.sortOrder} onChange={e=>setSelected({...selected,sortOrder:Number(e.target.value)})}/></label>
            <label className="cms-field hero-full"><span>Kurzbeschreibung (optional)</span><textarea value={selected.bio} onChange={e=>setSelected({...selected,bio:e.target.value})} rows={4}/></label>
          </div>
          <label className="coach-active"><input type="checkbox" checked={selected.active} onChange={e=>setSelected({...selected,active:e.target.checked})}/> Öffentlich anzeigen</label>
        </div>
      </AdminCard>
    </div>
  </AdminShell>;
}
