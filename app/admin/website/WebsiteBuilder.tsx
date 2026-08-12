"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { BuilderSectionView } from "../../SiteBuilderPage";
import type { BuilderItem, BuilderPage, BuilderSection, BuilderSectionType, SiteBuilderState } from "../../lib/site-builder";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./website-builder.css";

const sectionTypes: Array<{type:BuilderSectionType;label:string;desc:string}> = [
  {type:"hero",label:"Hero",desc:"Großer Einstieg mit Bild, Titel und Button"},
  {type:"text",label:"Text",desc:"Überschrift, Fließtext und CTA"},
  {type:"split",label:"Bild + Text",desc:"Zweispaltiger Inhaltsbereich"},
  {type:"stats",label:"Statistiken",desc:"Kennzahlen und KPIs"},
  {type:"cards",label:"Karten",desc:"Leistungen, Werte oder Inhalte"},
  {type:"gallery",label:"Galerie",desc:"Flexible Bildergalerie"},
  {type:"timeline",label:"Timeline",desc:"Geschichte, Seasons und Meilensteine"},
  {type:"games",label:"Spielplan",desc:"Dynamischer Spielplan aus dem Game Center"},
  {type:"news",label:"News",desc:"Dynamische News aus dem CMS"},
  {type:"sponsors",label:"Sponsoren",desc:"Dynamischer Sponsoren-Ticker"},
  {type:"cta",label:"Call to Action",desc:"Prominenter Abschlussbereich"},
  {type:"spacer",label:"Abstand",desc:"Freier Abstand zwischen Abschnitten"},
];

const iconLibrary = [
  ["Football","https://api.iconify.design/ion/american-football-outline.svg?color=%23e7192d"],
  ["Football gefüllt","https://api.iconify.design/ep/football.svg?color=%23e7192d"],
  ["Trophy","https://api.iconify.design/mdi/trophy-outline.svg?color=%23e7192d"],
  ["Whistle","https://api.iconify.design/mdi/whistle-outline.svg?color=%23e7192d"],
  ["Football Helm","https://api.iconify.design/streamline-ultimate/american-football-helmet.svg?color=%23e7192d"],
  ["Star","https://api.iconify.design/mdi/star-outline.svg?color=%23e7192d"],
  ["Shield","https://api.iconify.design/mdi/shield-outline.svg?color=%23e7192d"],
  ["Lightning","https://api.iconify.design/mdi/lightning-bolt-outline.svg?color=%23e7192d"],
  ["Target","https://api.iconify.design/mdi/target.svg?color=%23e7192d"],
  ["Heart","https://api.iconify.design/mdi/heart-outline.svg?color=%23e7192d"],
];

type MediaItem={key:string;url:string};
type PreviewMode="desktop"|"tablet"|"mobile";

function freshSection(type:BuilderSectionType):BuilderSection {
  const common={id:crypto.randomUUID(),type,visible:true,eyebrow:"",title:"NEUER ABSCHNITT",accent:"",text:"",image:"",image2:"",buttonLabel:"",buttonUrl:"",style:{background:"#050d18",textColor:"#ffffff",accentColor:"#e7192d",paddingTop:64,paddingBottom:64,minHeight:type==="hero"?560:0,align:"left" as const,maxWidth:1600,rounded:0,border:""},items:[] as BuilderItem[]};
  if(type==="hero") return {...common,eyebrow:"RASCALS",title:"DEIN TITEL",accent:"HIER.",text:"Passe Bild, Text, Farben und Abstände frei an.",image:"/helmet-hero-4k.webp",buttonLabel:"Mehr erfahren",buttonUrl:"/"};
  if(type==="timeline") return {...common,eyebrow:"UNSERE REISE",title:"FROM FIRST SNAP TO NEXT LEVEL.",items:[{id:crypto.randomUUID(),title:"2026",subtitle:"SEASON",value:"170 : 66",text:"Dein Meilenstein",icon:iconLibrary[0][1]}]};
  if(type==="stats") return {...common,title:"ZAHLEN & FAKTEN",items:[{id:crypto.randomUUID(),value:"100%",title:"TEAM",text:"Beschreibung"},{id:crypto.randomUUID(),value:"2023",title:"GEGRÜNDET",text:"Beschreibung"}]};
  if(type==="cards") return {...common,title:"UNSERE WERTE",items:[{id:crypto.randomUUID(),title:"TEAMGEIST",text:"Beschreibung",icon:iconLibrary[6][1]}]};
  if(type==="gallery") return {...common,title:"GALERIE",items:[{id:crypto.randomUUID(),title:"Rascals",image:"/team-entry-4k.webp"}]};
  if(type==="games") return {...common,eyebrow:"SAISON",title:"NÄCHSTE GAMES.",text:"Alle bestätigten Begegnungen auf einen Blick."};
  if(type==="news") return {...common,eyebrow:"INSIDE RASCALS",title:"FROM THE HUDDLE."};
  if(type==="sponsors") return {...common,title:"PROUDLY POWERED BY"};
  if(type==="cta") return {...common,eyebrow:"YOUR NEXT PLAY",title:"READY TO JOIN",accent:"THE FAMILY?",text:"Jetzt Probetraining anfragen.",buttonLabel:"Probetraining anfragen",buttonUrl:"mailto:football@hsb1846.de",style:{...common.style,align:"center"}};
  if(type==="split") return {...common,eyebrow:"MEHR ALS FOOTBALL",title:"EIN TEAM.",accent:"EINE FAMILIE.",text:"Dein Text",image:"/team-victory-4k.webp"};
  return common;
}

export function WebsiteBuilder(){
  const [state,setState]=useState<SiteBuilderState|null>(null);
  const [media,setMedia]=useState<MediaItem[]>([]);
  const [pageId,setPageId]=useState("");
  const [sectionId,setSectionId]=useState("");
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [notice,setNotice]=useState("");
  const [previewMode,setPreviewMode]=useState<PreviewMode>("desktop");

  useEffect(()=>{void load()},[]);
  async function load(){
    try{
      const [builderRes,mediaRes]=await Promise.all([fetch("/admin/api/site-builder"),fetch("/admin/api/media")]);
      if(!builderRes.ok)throw new Error("Website Builder konnte nicht geladen werden.");
      const builder=await builderRes.json() as {state:SiteBuilderState};
      const mediaBody=mediaRes.ok?await mediaRes.json() as {items:MediaItem[]}:{items:[]};
      setState(builder.state);setMedia(mediaBody.items||[]);setPageId(builder.state.pages[0]?.id||"");setSectionId(builder.state.pages[0]?.sections[0]?.id||"");
    }catch(e){setNotice(e instanceof Error?e.message:"Fehler beim Laden")}
  }

  const page=useMemo(()=>state?.pages.find(p=>p.id===pageId)??state?.pages[0],[state,pageId]);
  const section=useMemo(()=>page?.sections.find(s=>s.id===sectionId)??page?.sections[0],[page,sectionId]);

  function patchPage(patch:Partial<BuilderPage>){if(!state||!page)return;setState({...state,pages:state.pages.map(p=>p.id===page.id?{...p,...patch}:p)})}
  function patchSection(patch:Partial<BuilderSection>){if(!state||!page||!section)return;patchPage({sections:page.sections.map(s=>s.id===section.id?{...s,...patch}:s)})}
  function patchStyle(key:string,value:string|number){if(!section)return;patchSection({style:{...section.style,[key]:value}})}

  function createPage(){if(!state)return;const id=crypto.randomUUID();const page:BuilderPage={id,name:"Neue Seite",slug:`seite-${state.pages.length+1}`,enabled:true,showInNav:true,navLabel:"Neue Seite",sections:[freshSection("hero")]};setState({...state,pages:[...state.pages,page]});setPageId(id);setSectionId(page.sections[0].id)}
  function duplicatePage(){if(!state||!page)return;const id=crypto.randomUUID();const copy:BuilderPage={...page,id,name:`${page.name} Kopie`,slug:`${page.slug||"start"}-kopie`,sections:page.sections.map(s=>({...s,id:crypto.randomUUID(),items:s.items.map(i=>({...i,id:crypto.randomUUID()}))}))};setState({...state,pages:[...state.pages,copy]});setPageId(id);setSectionId(copy.sections[0]?.id||"")}
  function deletePage(){if(!state||!page||state.pages.length<=1)return;if(!confirm(`Seite „${page.name}“ wirklich löschen?`))return;const pages=state.pages.filter(p=>p.id!==page.id);setState({...state,pages});setPageId(pages[0]?.id||"");setSectionId(pages[0]?.sections[0]?.id||"")}
  function addSection(type:BuilderSectionType){if(!page)return;const next=freshSection(type);patchPage({sections:[...page.sections,next]});setSectionId(next.id)}
  function duplicateSection(){if(!page||!section)return;const copy={...section,id:crypto.randomUUID(),items:section.items.map(i=>({...i,id:crypto.randomUUID()}))};const index=page.sections.findIndex(s=>s.id===section.id);const sections=[...page.sections];sections.splice(index+1,0,copy);patchPage({sections});setSectionId(copy.id)}
  function deleteSection(){if(!page||!section)return;if(!confirm("Abschnitt wirklich löschen?"))return;const sections=page.sections.filter(s=>s.id!==section.id);patchPage({sections});setSectionId(sections[0]?.id||"")}
  function moveSection(direction:-1|1){if(!page||!section)return;const index=page.sections.findIndex(s=>s.id===section.id);const target=index+direction;if(target<0||target>=page.sections.length)return;const sections=[...page.sections];[sections[index],sections[target]]=[sections[target],sections[index]];patchPage({sections})}
  function addItem(){if(!section)return;patchSection({items:[...section.items,{id:crypto.randomUUID(),title:"Neues Element",text:"",value:"",subtitle:"",image:"",icon:iconLibrary[0][1]}]})}
  function patchItem(id:string,patch:Partial<BuilderItem>){if(!section)return;patchSection({items:section.items.map(i=>i.id===id?{...i,...patch}:i)})}
  function deleteItem(id:string){if(!section)return;patchSection({items:section.items.filter(i=>i.id!==id)})}

  async function upload(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(!file||!section)return;setUploading(true);try{const data=new FormData();data.append("file",file);const r=await fetch("/admin/api/media",{method:"POST",body:data});const b=await r.json() as {url?:string;key?:string;error?:string};if(!r.ok||!b.url)throw new Error(b.error||"Upload fehlgeschlagen");patchSection({image:b.url});setMedia(cur=>b.key?[{key:b.key,url:b.url!},...cur]:cur);setNotice("Bild hochgeladen.")}catch(e){setNotice(e instanceof Error?e.message:"Upload fehlgeschlagen")}finally{setUploading(false);event.target.value=""}}
  async function save(){if(!state)return;setSaving(true);setNotice("");try{const r=await fetch("/admin/api/site-builder",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(state)});const b=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(b.error||"Speichern fehlgeschlagen");setNotice("Website gespeichert. Aktivierte Seiten verwenden jetzt den Builder.")}catch(e){setNotice(e instanceof Error?e.message:"Speichern fehlgeschlagen")}finally{setSaving(false)}}

  if(!state||!page)return <AdminShell active="website" title="Website Builder"><AdminCard>Builder wird geladen…</AdminCard></AdminShell>;

  return <AdminShell active="website" title="Website Builder" eyebrow="RASCALS CUSTOMIZER" actions={<button className="cms-button" disabled={saving} onClick={()=>void save()}>{saving?"Speichert…":"Website speichern"}</button>}>
    {notice&&<AdminNotice tone={notice.includes("gespeichert")||notice.includes("hochgeladen")?"success":"error"}>{notice}</AdminNotice>}
    <div className="wb-layout">
      <aside className="wb-pages"><AdminCard><div className="cms-section-head"><div><small>SEITEN</small><h2>Website</h2></div><button className="cms-button secondary" onClick={createPage}>＋ Seite</button></div><div className="wb-page-list">{state.pages.map(p=><button key={p.id} className={p.id===page.id?"active":""} onClick={()=>{setPageId(p.id);setSectionId(p.sections[0]?.id||"")}}><span>{p.enabled?"●":"○"}</span><div><b>{p.name}</b><small>/{p.slug}</small></div></button>)}</div></AdminCard>
      <AdminCard><div className="cms-section-head"><div><small>GLOBAL</small><h2>Design</h2></div></div><div className="wb-color-grid">{[["background","Hintergrund"],["surface","Flächen"],["text","Text"],["muted","Sekundärtext"],["accent","Akzent"],["headerBackground","Header"]].map(([key,label])=><label className="cms-field" key={key}><span>{label}</span><input type="color" value={(state.theme as any)[key]} onChange={e=>setState({...state,theme:{...state.theme,[key]:e.target.value}})}/></label>)}</div></AdminCard></aside>

      <section className="wb-main">
        <AdminCard><div className="cms-section-head"><div><small>SEITEN-EINSTELLUNGEN</small><h2>{page.name}</h2></div><div className="wb-inline"><button className="cms-button secondary" onClick={duplicatePage}>Duplizieren</button><button className="cms-button secondary danger" onClick={deletePage}>Löschen</button></div></div><div className="cms-grid-2"><label className="cms-field"><span>Name</span><input value={page.name} onChange={e=>patchPage({name:e.target.value})}/></label><label className="cms-field"><span>URL / Slug</span><input value={page.slug} onChange={e=>patchPage({slug:e.target.value})} placeholder="z. B. kontakt"/></label><label className="cms-field"><span>Navigation</span><input value={page.navLabel} onChange={e=>patchPage({navLabel:e.target.value})}/></label><div className="wb-switches"><label><input type="checkbox" checked={page.enabled} onChange={e=>patchPage({enabled:e.target.checked})}/> Builder für diese Seite aktiv</label><label><input type="checkbox" checked={page.showInNav} onChange={e=>patchPage({showInNav:e.target.checked})}/> In Navigation anzeigen</label></div></div></AdminCard>

        <div className="wb-workspace">
          <AdminCard className="wb-section-list"><div className="cms-section-head"><div><small>ABSCHNITTE</small><h2>Seitenaufbau</h2></div></div><div className="wb-sections">{page.sections.map((s,index)=><button key={s.id} className={s.id===section?.id?"active":""} onClick={()=>setSectionId(s.id)}><span>{String(index+1).padStart(2,"0")}</span><div><b>{sectionTypes.find(t=>t.type===s.type)?.label||s.type}</b><small>{s.title||s.eyebrow||"Ohne Titel"}</small></div><i>{s.visible?"●":"○"}</i></button>)}</div><div className="wb-add-section"><b>Abschnitt hinzufügen</b>{sectionTypes.map(t=><button key={t.type} onClick={()=>addSection(t.type)}><strong>{t.label}</strong><small>{t.desc}</small></button>)}</div></AdminCard>

          {section&&<div className="wb-editor">
            <AdminCard><div className="cms-section-head"><div><small>ABSCHNITT</small><h2>{sectionTypes.find(t=>t.type===section.type)?.label}</h2></div><div className="wb-inline"><button className="cms-button secondary" onClick={()=>moveSection(-1)}>↑</button><button className="cms-button secondary" onClick={()=>moveSection(1)}>↓</button><button className="cms-button secondary" onClick={duplicateSection}>Duplizieren</button><button className="cms-button secondary danger" onClick={deleteSection}>Löschen</button></div></div><label className="wb-visible"><input type="checkbox" checked={section.visible} onChange={e=>patchSection({visible:e.target.checked})}/> Abschnitt sichtbar</label><div className="cms-grid-2"><label className="cms-field"><span>Eyebrow</span><input value={section.eyebrow||""} onChange={e=>patchSection({eyebrow:e.target.value})}/></label><label className="cms-field"><span>Überschrift</span><input value={section.title||""} onChange={e=>patchSection({title:e.target.value})}/></label><label className="cms-field"><span>Akzenttext</span><input value={section.accent||""} onChange={e=>patchSection({accent:e.target.value})}/></label><label className="cms-field"><span>Button Text</span><input value={section.buttonLabel||""} onChange={e=>patchSection({buttonLabel:e.target.value})}/></label><label className="cms-field"><span>Button Link</span><input value={section.buttonUrl||""} onChange={e=>patchSection({buttonUrl:e.target.value})}/></label><label className="cms-field"><span>Bild aus Medien</span><select value={section.image||""} onChange={e=>patchSection({image:e.target.value})}><option value="">Kein Bild</option>{section.image&&<option value={section.image}>Aktuelles Bild</option>}{media.map(m=><option key={m.key} value={m.url}>{m.key.split("/").pop()}</option>)}</select></label><label className="cms-field wb-full"><span>Text</span><textarea rows={5} value={section.text||""} onChange={e=>patchSection({text:e.target.value})}/></label><label className="cms-field wb-full"><span>Neues Bild hochladen</span><input type="file" accept="image/*" disabled={uploading} onChange={e=>void upload(e)}/></label></div></AdminCard>

            <AdminCard><div className="cms-section-head"><div><small>DESIGN</small><h2>Layout & Farben</h2></div></div><div className="wb-design-grid"><label className="cms-field"><span>Hintergrund</span><input type="color" value={section.style.background||"#050d18"} onChange={e=>patchStyle("background",e.target.value)}/></label><label className="cms-field"><span>Textfarbe</span><input type="color" value={section.style.textColor||"#ffffff"} onChange={e=>patchStyle("textColor",e.target.value)}/></label><label className="cms-field"><span>Akzent</span><input type="color" value={section.style.accentColor||"#e7192d"} onChange={e=>patchStyle("accentColor",e.target.value)}/></label><label className="cms-field"><span>Ausrichtung</span><select value={section.style.align||"left"} onChange={e=>patchStyle("align",e.target.value)}><option value="left">Links</option><option value="center">Zentriert</option><option value="right">Rechts</option></select></label><label className="cms-field"><span>Abstand oben</span><input type="number" value={section.style.paddingTop??64} onChange={e=>patchStyle("paddingTop",Number(e.target.value))}/></label><label className="cms-field"><span>Abstand unten</span><input type="number" value={section.style.paddingBottom??64} onChange={e=>patchStyle("paddingBottom",Number(e.target.value))}/></label><label className="cms-field"><span>Mindesthöhe</span><input type="number" value={section.style.minHeight??0} onChange={e=>patchStyle("minHeight",Number(e.target.value))}/></label><label className="cms-field"><span>Max. Breite</span><input type="number" value={section.style.maxWidth??1600} onChange={e=>patchStyle("maxWidth",Number(e.target.value))}/></label></div></AdminCard>

            {["timeline","stats","cards","gallery"].includes(section.type)&&<AdminCard><div className="cms-section-head"><div><small>ELEMENTE</small><h2>Inhalte</h2></div><button className="cms-button secondary" onClick={addItem}>＋ Element</button></div><div className="wb-items">{section.items.map((item,index)=><div className="wb-item" key={item.id}><div className="wb-item-head"><b>Element {index+1}</b><button onClick={()=>deleteItem(item.id)}>×</button></div><div className="cms-grid-2"><label className="cms-field"><span>Titel / Jahr</span><input value={item.title||""} onChange={e=>patchItem(item.id,{title:e.target.value})}/></label><label className="cms-field"><span>Untertitel</span><input value={item.subtitle||""} onChange={e=>patchItem(item.id,{subtitle:e.target.value})}/></label><label className="cms-field"><span>Wert / Punkte</span><input value={item.value||""} onChange={e=>patchItem(item.id,{value:e.target.value})}/></label><label className="cms-field"><span>Bild</span><select value={item.image||""} onChange={e=>patchItem(item.id,{image:e.target.value})}><option value="">Kein Bild</option>{media.map(m=><option key={m.key} value={m.url}>{m.key.split("/").pop()}</option>)}</select></label><label className="cms-field wb-full"><span>Symbol</span><div className="wb-icon-picker"><select value={item.icon||""} onChange={e=>patchItem(item.id,{icon:e.target.value})}><option value="">Kein Symbol</option>{iconLibrary.map(([name,url])=><option value={url} key={url}>{name}</option>)}</select>{item.icon&&<img src={item.icon} alt=""/>}</div></label><label className="cms-field wb-full"><span>Text</span><textarea rows={3} value={item.text||""} onChange={e=>patchItem(item.id,{text:e.target.value})}/></label></div></div>)}</div></AdminCard>}

            <AdminCard><div className="wb-preview-head"><div><small>LIVE PREVIEW</small><h2>Abschnitt</h2></div><div>{(["desktop","tablet","mobile"] as PreviewMode[]).map(mode=><button key={mode} className={previewMode===mode?"active":""} onClick={()=>setPreviewMode(mode)}>{mode}</button>)}</div></div><div className={`wb-preview ${previewMode}`}><BuilderSectionView section={section}/></div></AdminCard>
          </div>}
        </div>
      </section>
    </div>
  </AdminShell>
}
