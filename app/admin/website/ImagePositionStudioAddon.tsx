"use client";

import { useEffect, useMemo, useState } from "react";
import type { BuilderItem, BuilderPage, BuilderSection, SiteBuilderState } from "../../lib/site-builder";
import "./image-position-studio.css";

type PositionKey="top-left"|"top"|"top-right"|"left"|"center"|"right"|"bottom-left"|"bottom"|"bottom-right";
const positions:Array<{key:PositionKey;label:string}>=[
  {key:"top-left",label:"↖"},{key:"top",label:"↑"},{key:"top-right",label:"↗"},
  {key:"left",label:"←"},{key:"center",label:"●"},{key:"right",label:"→"},
  {key:"bottom-left",label:"↙"},{key:"bottom",label:"↓"},{key:"bottom-right",label:"↘"},
];
const posMap:Record<PositionKey,string>={"top-left":"left top",top:"center top","top-right":"right top",left:"left center",center:"center center",right:"right center","bottom-left":"left bottom",bottom:"center bottom","bottom-right":"right bottom"};
const strip=(url:string)=>url.replace(/#pos-[a-z-]+$/i,"");
const withPos=(url:string,key:PositionKey)=>`${strip(url)}#pos-${key}`;
const currentPos=(url:string):PositionKey=>((url.match(/#pos-([a-z-]+)$/i)?.[1] as PositionKey)||"center");

type ImageRef={id:string;label:string;url:string;sectionId:string;itemId?:string;kind:"section"|"item"|"background"};

export function ImagePositionStudioAddon(){
  const[state,setState]=useState<SiteBuilderState|null>(null);
  const[pageId,setPageId]=useState("");
  const[open,setOpen]=useState(false);
  const[saving,setSaving]=useState(false);
  const[notice,setNotice]=useState("");

  useEffect(()=>{fetch("/admin/api/site-builder").then(r=>r.ok?r.json():null).then(body=>{if(body?.state){setState(body.state);setPageId(body.state.pages[0]?.id||"")}})},[]);
  const page=useMemo(()=>state?.pages.find(p=>p.id===pageId)||state?.pages[0],[state,pageId]);
  const images=useMemo<ImageRef[]>(()=>{
    if(!page)return[];
    const list:ImageRef[]=[];
    for(const section of page.sections){
      if(section.image)list.push({id:`s:${section.id}`,label:`${section.title||section.type} · Hauptbild`,url:section.image,sectionId:section.id,kind:"section"});
      if(section.style.backgroundImage)list.push({id:`b:${section.id}`,label:`${section.title||section.type} · Hintergrund`,url:section.style.backgroundImage,sectionId:section.id,kind:"background"});
      for(const item of section.items){if(item.image)list.push({id:`i:${section.id}:${item.id}`,label:`${section.title||section.type} · ${item.title||"Bild"}`,url:item.image,sectionId:section.id,itemId:item.id,kind:"item"})}
    }
    return list;
  },[page]);

  function patchImage(ref:ImageRef,key:PositionKey){if(!state||!page)return;const pages=state.pages.map(p=>p.id!==page.id?p:{...p,sections:p.sections.map(section=>{
    if(section.id!==ref.sectionId)return section;
    if(ref.kind==="background")return{...section,style:{...section.style,backgroundPosition:posMap[key]}};
    if(ref.kind==="section")return{...section,image:withPos(strip(section.image||ref.url),key)};
    return{...section,items:section.items.map((item:BuilderItem)=>item.id===ref.itemId?{...item,image:withPos(strip(item.image||ref.url),key)}:item)};
  })});setState({...state,pages})}

  async function save(){if(!state)return;setSaving(true);setNotice("");try{const response=await fetch("/admin/api/site-builder",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(state)});if(!response.ok)throw new Error("Bildpositionen konnten nicht gespeichert werden.");setNotice("Bildpositionen als Entwurf gespeichert.")}catch(error){setNotice(error instanceof Error?error.message:"Speichern fehlgeschlagen.")}finally{setSaving(false)}}

  if(!state||!page)return null;
  return <section className="image-pos-studio">
    <button className="image-pos-toggle" onClick={()=>setOpen(!open)}><span><b>▣ · Bilder positionieren</b><small>Bildfokus nach oben, unten, links oder rechts verschieben</small></span><em>{open?"−":"+"}</em></button>
    {open&&<div className="image-pos-body">
      <div className="image-pos-top"><label><span>Seite</span><select value={page.id} onChange={e=>setPageId(e.target.value)}>{state.pages.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><p>Wähle bei jedem Bild den sichtbaren Fokuspunkt. Besonders bei zugeschnittenen Bildern auf Mobilgeräten bleibt so das wichtige Motiv im Bild.</p></div>
      {notice&&<div className="image-pos-notice">{notice}</div>}
      <div className="image-pos-list">{images.map(ref=>{const section=page.sections.find((s:BuilderSection)=>s.id===ref.sectionId);const active=ref.kind==="background"?Object.entries(posMap).find(([,v])=>v===(section?.style.backgroundPosition||"center center"))?.[0] as PositionKey||"center":currentPos(ref.url);return <article key={ref.id}><div className="image-pos-preview"><img src={strip(ref.url)} alt="" style={{objectPosition:ref.kind==="background"?(section?.style.backgroundPosition||"center center"):posMap[active]}}/></div><div className="image-pos-copy"><b>{ref.label}</b><small>{ref.kind==="background"?"Hintergrundbild":"Inhaltsbild"}</small><div className="image-pos-grid">{positions.map(pos=><button key={pos.key} className={active===pos.key?"active":""} onClick={()=>patchImage(ref,pos.key)} title={pos.key}>{pos.label}</button>)}</div></div></article>})}</div>
      {!images.length&&<div className="image-pos-empty">Auf dieser Seite sind noch keine positionierbaren Bilder vorhanden.</div>}
      <div className="image-pos-footer"><span>Die Originaldatei bleibt unverändert. Es wird nur der sichtbare Ausschnitt gespeichert.</span><button onClick={()=>void save()} disabled={saving}>{saving?"Speichert…":"Als Entwurf speichern"}</button></div>
    </div>}
  </section>
}
