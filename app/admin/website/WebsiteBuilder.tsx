"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { BuilderSectionView } from "../../SiteBuilderPage";
import type { BuilderItem, BuilderPage, BuilderSection, BuilderSectionType, SiteBuilderState } from "../../lib/site-builder";
import { AdminNotice, AdminShell } from "../_components/AdminShell";
import "./website-builder.css";

const sectionTypes: Array<{type:BuilderSectionType;label:string;desc:string;glyph:string}> = [
  {type:"hero",label:"Hero",desc:"Großer Einstieg mit Bild und CTA",glyph:"▣"},
  {type:"text",label:"Text",desc:"Überschrift und Fließtext",glyph:"T"},
  {type:"split",label:"Bild + Text",desc:"Zweispaltiger Inhaltsbereich",glyph:"◧"},
  {type:"stats",label:"Statistiken",desc:"Kennzahlen und KPIs",glyph:"#"},
  {type:"cards",label:"Karten",desc:"Werte, Leistungen oder Inhalte",glyph:"▦"},
  {type:"gallery",label:"Galerie",desc:"Flexible Bildergalerie",glyph:"◫"},
  {type:"timeline",label:"Timeline",desc:"Seasons und Meilensteine",glyph:"→"},
  {type:"games",label:"Spielplan",desc:"Dynamisch aus dem Game Center",glyph:"▤"},
  {type:"news",label:"News",desc:"Dynamisch aus dem News-CMS",glyph:"◆"},
  {type:"sponsors",label:"Sponsoren",desc:"Dynamischer Partner-Ticker",glyph:"◇"},
  {type:"cta",label:"Call to Action",desc:"Prominenter Abschlussbereich",glyph:"↗"},
  {type:"spacer",label:"Abstand",desc:"Freier Abstand zwischen Bereichen",glyph:"↕"},
];

const iconLibrary = [
  ["Football","https://api.iconify.design/ion/american-football-outline.svg?color=%23e7192d"],
  ["Football gefüllt","https://api.iconify.design/ion/american-football.svg?color=%23e7192d"],
  ["Trophy","https://api.iconify.design/mdi/trophy-outline.svg?color=%23e7192d"],
  ["Pfeife","https://api.iconify.design/mdi/whistle-outline.svg?color=%23e7192d"],
  ["Football Helm","https://api.iconify.design/streamline-ultimate/american-football-helmet.svg?color=%23e7192d"],
  ["Team","https://api.iconify.design/mdi/account-group-outline.svg?color=%23e7192d"],
  ["Shield","https://api.iconify.design/mdi/shield-check-outline.svg?color=%23e7192d"],
  ["Heart","https://api.iconify.design/mdi/heart-outline.svg?color=%23e7192d"],
  ["Target","https://api.iconify.design/mdi/target.svg?color=%23e7192d"],
  ["Star","https://api.iconify.design/mdi/star-outline.svg?color=%23e7192d"],
] as const;

type MediaItem={key:string;url:string};
type PreviewMode="desktop"|"tablet"|"mobile";
type InspectorMode="section"|"page"|"theme";
type InspectorTab="content"|"design"|"items";

const typeLabel=(type:BuilderSectionType)=>sectionTypes.find(item=>item.type===type)?.label??type;
const itemTypes=new Set<BuilderSectionType>(["stats","cards","gallery","timeline"]);
const dynamicTypes=new Set<BuilderSectionType>(["games","news","sponsors"]);

function slugify(value:string){return value.trim().toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}

function freshSection(type:BuilderSectionType):BuilderSection {
  const common:BuilderSection={id:crypto.randomUUID(),type,visible:true,eyebrow:"",title:"NEUER ABSCHNITT",accent:"",text:"",image:"",image2:"",buttonLabel:"",buttonUrl:"",style:{background:"#050d18",textColor:"#ffffff",accentColor:"#e7192d",paddingTop:64,paddingBottom:64,minHeight:type==="hero"?560:0,align:"left",maxWidth:1600,rounded:0,border:""},items:[]};
  if(type==="hero")return{...common,eyebrow:"RASCALS",title:"DEIN TITEL",accent:"HIER.",text:"Bild, Text und Farben kannst du rechts direkt ändern.",image:"/helmet-hero-4k.webp",buttonLabel:"Mehr erfahren",buttonUrl:"/"};
  if(type==="timeline")return{...common,eyebrow:"UNSERE REISE",title:"FROM FIRST SNAP TO NEXT LEVEL.",items:[{id:crypto.randomUUID(),title:"2026",subtitle:"SEASON",value:"170 : 66",text:"Dein Meilenstein",icon:iconLibrary[0][1]}]};
  if(type==="stats")return{...common,title:"ZAHLEN & FAKTEN",items:[{id:crypto.randomUUID(),value:"100%",title:"TEAM",text:"Beschreibung"},{id:crypto.randomUUID(),value:"2023",title:"GEGRÜNDET",text:"Beschreibung"}]};
  if(type==="cards")return{...common,title:"UNSERE WERTE",items:[{id:crypto.randomUUID(),title:"TEAMGEIST",text:"Beschreibung",icon:iconLibrary[5][1]}]};
  if(type==="gallery")return{...common,title:"GALERIE",items:[{id:crypto.randomUUID(),title:"Rascals",image:"/team-entry-4k.webp"}]};
  if(type==="games")return{...common,eyebrow:"SAISON",title:"NÄCHSTE GAMES.",text:"Alle bestätigten Begegnungen auf einen Blick."};
  if(type==="news")return{...common,eyebrow:"INSIDE RASCALS",title:"FROM THE HUDDLE."};
  if(type==="sponsors")return{...common,title:"PROUDLY POWERED BY"};
  if(type==="cta")return{...common,eyebrow:"YOUR NEXT PLAY",title:"READY TO JOIN",accent:"THE FAMILY?",text:"Jetzt Probetraining anfragen.",buttonLabel:"Probetraining anfragen",buttonUrl:"mailto:football@hsb1846.de",style:{...common.style,align:"center"}};
  if(type==="split")return{...common,eyebrow:"MEHR ALS FOOTBALL",title:"EIN TEAM.",accent:"EINE FAMILIE.",text:"Dein Text",image:"/team-victory-4k.webp"};
  return common;
}

export function WebsiteBuilder(){
  const [state,setState]=useState<SiteBuilderState|null>(null);
  const [media,setMedia]=useState<MediaItem[]>([]);
  const [pageId,setPageId]=useState("");
  const [sectionId,setSectionId]=useState("");
  const [inspectorMode,setInspectorMode]=useState<InspectorMode>("section");
  const [inspectorTab,setInspectorTab]=useState<InspectorTab>("content");
  const [previewMode,setPreviewMode]=useState<PreviewMode>("desktop");
  const [showLibrary,setShowLibrary]=useState(false);
  const [showNewPage,setShowNewPage]=useState(false);
  const [newPageName,setNewPageName]=useState("");
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [notice,setNotice]=useState("");
  const [savedSnapshot,setSavedSnapshot]=useState("");

  useEffect(()=>{void load()},[]);

  async function load(){
    try{
      const [builderRes,mediaRes]=await Promise.all([fetch("/admin/api/site-builder"),fetch("/admin/api/media")]);
      if(!builderRes.ok)throw new Error("Website Studio konnte nicht geladen werden.");
      const builder=await builderRes.json() as {state:SiteBuilderState};
      const mediaBody=mediaRes.ok?await mediaRes.json() as {items:MediaItem[]}:{items:[]};
      setState(builder.state);
      setSavedSnapshot(JSON.stringify(builder.state));
      setMedia(mediaBody.items||[]);
      const first=builder.state.pages[0];
      setPageId(first?.id||"");
      setSectionId(first?.sections[0]?.id||"");
    }catch(error){setNotice(error instanceof Error?error.message:"Fehler beim Laden")}
  }

  const page=useMemo(()=>state?.pages.find(item=>item.id===pageId)??state?.pages[0],[state,pageId]);
  const section=useMemo(()=>page?.sections.find(item=>item.id===sectionId)??page?.sections[0],[page,sectionId]);
  const dirty=!!state&&JSON.stringify(state)!==savedSnapshot;
  const duplicateSlug=!!state&&state.pages.some((candidate,index)=>state.pages.findIndex(item=>item.slug.trim().toLowerCase()===candidate.slug.trim().toLowerCase())!==index);

  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="s"){
        event.preventDefault();
        if(dirty&&!saving&&!duplicateSlug)void save();
      }
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[dirty,saving,duplicateSlug,state]);

  function selectPage(id:string){
    if(!state)return;
    const next=state.pages.find(item=>item.id===id);
    if(!next)return;
    setPageId(id);setSectionId(next.sections[0]?.id||"");setInspectorMode(next.sections.length?"section":"page");setInspectorTab("content");
  }

  function patchPage(patch:Partial<BuilderPage>){if(!state||!page)return;setState({...state,pages:state.pages.map(item=>item.id===page.id?{...item,...patch}:item)})}
  function patchSection(patch:Partial<BuilderSection>){if(!page||!section)return;patchPage({sections:page.sections.map(item=>item.id===section.id?{...item,...patch}:item)})}
  function patchStyle<K extends keyof BuilderSection["style"]>(key:K,value:BuilderSection["style"][K]){if(!section)return;patchSection({style:{...section.style,[key]:value}})}
  function patchItem(id:string,patch:Partial<BuilderItem>){if(!section)return;patchSection({items:section.items.map(item=>item.id===id?{...item,...patch}:item)})}

  function createPage(){
    if(!state)return;
    const name=newPageName.trim()||"Neue Seite";
    const base=slugify(name)||`seite-${state.pages.length+1}`;
    let slug=base;let count=2;
    while(state.pages.some(item=>item.slug===slug)){slug=`${base}-${count++}`}
    const first=freshSection("hero");
    const next:BuilderPage={id:crypto.randomUUID(),name,slug,enabled:false,showInNav:false,navLabel:name,sections:[first]};
    setState({...state,pages:[...state.pages,next]});
    setPageId(next.id);setSectionId(first.id);setInspectorMode("page");setShowNewPage(false);setNewPageName("");
  }

  function duplicatePage(){
    if(!state||!page)return;
    const base=`${page.slug||"startseite"}-kopie`;let slug=base;let count=2;
    while(state.pages.some(item=>item.slug===slug)){slug=`${base}-${count++}`}
    const copy:BuilderPage={...page,id:crypto.randomUUID(),name:`${page.name} Kopie`,slug,enabled:false,showInNav:false,sections:page.sections.map(item=>({...item,id:crypto.randomUUID(),items:item.items.map(child=>({...child,id:crypto.randomUUID()}))}))};
    setState({...state,pages:[...state.pages,copy]});setPageId(copy.id);setSectionId(copy.sections[0]?.id||"");setInspectorMode("page");
  }

  function deletePage(){
    if(!state||!page||page.slug==="")return;
    if(!confirm(`Seite „${page.name}“ wirklich löschen?`))return;
    const pages=state.pages.filter(item=>item.id!==page.id);
    setState({...state,pages});selectPage(pages[0]?.id||"");
  }

  function addSection(type:BuilderSectionType){
    if(!page)return;
    const next=freshSection(type);patchPage({sections:[...page.sections,next]});setSectionId(next.id);setInspectorMode("section");setInspectorTab("content");setShowLibrary(false);
  }

  function duplicateSection(){if(!page||!section)return;const copy={...section,id:crypto.randomUUID(),items:section.items.map(item=>({...item,id:crypto.randomUUID()}))};const index=page.sections.findIndex(item=>item.id===section.id);const sections=[...page.sections];sections.splice(index+1,0,copy);patchPage({sections});setSectionId(copy.id)}
  function deleteSection(){if(!page||!section)return;if(!confirm("Abschnitt wirklich löschen?"))return;const sections=page.sections.filter(item=>item.id!==section.id);patchPage({sections});setSectionId(sections[0]?.id||"");if(!sections.length)setInspectorMode("page")}
  function moveSection(direction:-1|1){if(!page||!section)return;const index=page.sections.findIndex(item=>item.id===section.id);const target=index+direction;if(target<0||target>=page.sections.length)return;const sections=[...page.sections];[sections[index],sections[target]]=[sections[target],sections[index]];patchPage({sections})}
  function addItem(){if(!section)return;patchSection({items:[...section.items,{id:crypto.randomUUID(),title:"Neues Element",text:"",value:"",subtitle:"",image:"",icon:iconLibrary[0][1]}]})}
  function deleteItem(id:string){if(!section)return;patchSection({items:section.items.filter(item=>item.id!==id)})}

  async function uploadImage(event:ChangeEvent<HTMLInputElement>,apply:(url:string)=>void){
    const file=event.target.files?.[0];if(!file)return;
    setUploading(true);setNotice("");
    try{
      const data=new FormData();data.append("file",file);
      const response=await fetch("/admin/api/media",{method:"POST",body:data});
      const body=await response.json() as {url?:string;key?:string;error?:string};
      if(!response.ok||!body.url)throw new Error(body.error||"Upload fehlgeschlagen");
      apply(body.url);
      if(body.key)setMedia(current=>[{key:body.key!,url:body.url!},...current.filter(item=>item.key!==body.key)]);
      setNotice("Bild hochgeladen.");
    }catch(error){setNotice(error instanceof Error?error.message:"Upload fehlgeschlagen")}
    finally{setUploading(false);event.target.value=""}
  }

  async function save(){
    if(!state||duplicateSlug)return;
    setSaving(true);setNotice("");
    try{
      const response=await fetch("/admin/api/site-builder",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(state)});
      const body=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok)throw new Error(body.error||"Speichern fehlgeschlagen");
      setSavedSnapshot(JSON.stringify(state));
      setNotice("Gespeichert. Veröffentlichte Seiten sind jetzt live.");
    }catch(error){setNotice(error instanceof Error?error.message:"Speichern fehlgeschlagen")}
    finally{setSaving(false)}
  }

  if(!state||!page)return <AdminShell active="website" title="Website gestalten"><div className="wb-loading">Website Studio wird geladen…</div></AdminShell>;

  return <AdminShell active="website" title="Website gestalten" eyebrow="RASCALS STUDIO" actions={<div className="wb-save-cluster"><span className={`wb-save-state ${dirty?"dirty":""}`}>{dirty?"Ungespeichert":"Gespeichert"}</span><button className="cms-button" disabled={saving||!dirty||duplicateSlug} onClick={()=>void save()}>{saving?"Speichert…":"Speichern"}</button></div>}>
    {notice&&<AdminNotice tone={notice.startsWith("Gespeichert")||notice.includes("hochgeladen")?"success":"error"}>{notice}</AdminNotice>}
    {duplicateSlug&&<AdminNotice tone="error">Zwei Seiten verwenden dieselbe URL. Bitte die URL einer Seite ändern.</AdminNotice>}

    <div className="wb-studio">
      <aside className="wb-navigator">
        <div className="wb-nav-head"><div><small>SEITEN</small><strong>Website</strong></div><button onClick={()=>setShowNewPage(true)} aria-label="Neue Seite">＋</button></div>
        <div className="wb-page-list">{state.pages.map(item=><button key={item.id} className={item.id===page.id?"active":""} onClick={()=>selectPage(item.id)}><span className={item.enabled?"live":""}/><div><b>{item.name}</b><small>{item.slug?`/${item.slug}`:"/"}</small></div></button>)}</div>

        <div className="wb-nav-divider"/>
        <div className="wb-nav-head"><div><small>AUFBAU</small><strong>{page.name}</strong></div><button onClick={()=>setShowLibrary(true)} aria-label="Abschnitt hinzufügen">＋</button></div>
        <button className={`wb-nav-special ${inspectorMode==="page"?"active":""}`} onClick={()=>setInspectorMode("page")}><span>⚙</span><b>Seite</b><small>Name, URL, Status</small></button>
        <div className="wb-section-list">{page.sections.map((item,index)=><button key={item.id} className={inspectorMode==="section"&&item.id===section?.id?"active":""} onClick={()=>{setSectionId(item.id);setInspectorMode("section");setInspectorTab("content")}}><span>{String(index+1).padStart(2,"0")}</span><div><b>{typeLabel(item.type)}</b><small>{item.title||item.eyebrow||"Ohne Titel"}</small></div><i className={item.visible?"live":""}/></button>)}</div>
        <button className={`wb-nav-special ${inspectorMode==="theme"?"active":""}`} onClick={()=>setInspectorMode("theme")}><span>◐</span><b>Website Design</b><small>Farben & Stil</small></button>
        <button className="wb-add-main" onClick={()=>setShowLibrary(true)}>＋ Abschnitt hinzufügen</button>
      </aside>

      <main className="wb-canvas-column">
        <div className="wb-canvas-toolbar">
          <div><span className={page.enabled?"live":""}/><b>{page.name}</b><small>{page.enabled?"Veröffentlicht":"Entwurf"}</small></div>
          <div className="wb-device-switch">{(["desktop","tablet","mobile"] as PreviewMode[]).map(mode=><button key={mode} className={previewMode===mode?"active":""} onClick={()=>setPreviewMode(mode)}>{mode==="desktop"?"Desktop":mode==="tablet"?"Tablet":"Mobil"}</button>)}</div>
          <a href={page.slug?`/${page.slug}`:"/"} target="_blank">Öffnen ↗</a>
        </div>
        <div className="wb-canvas-shell"><div className={`wb-canvas ${previewMode}`}>
          {page.sections.length?page.sections.map(item=><div key={item.id} className={`wb-canvas-section ${inspectorMode==="section"&&item.id===section?.id?"selected":""}`} onClickCapture={event=>{event.preventDefault();event.stopPropagation();setSectionId(item.id);setInspectorMode("section")}}><BuilderSectionView section={item}/><span className="wb-selection-label">{typeLabel(item.type)}</span></div>):<button className="wb-empty-page" onClick={()=>setShowLibrary(true)}><b>Deine Seite ist leer</b><span>Ersten Abschnitt hinzufügen</span></button>}
        </div></div>
      </main>

      <aside className="wb-inspector">
        {inspectorMode==="page"&&<PageInspector page={page} patchPage={patchPage} duplicatePage={duplicatePage} deletePage={deletePage}/>} 
        {inspectorMode==="theme"&&<ThemeInspector state={state} setState={setState}/>} 
        {inspectorMode==="section"&&section&&<SectionInspector section={section} media={media} uploading={uploading} tab={inspectorTab} setTab={setInspectorTab} patchSection={patchSection} patchStyle={patchStyle} patchItem={patchItem} addItem={addItem} deleteItem={deleteItem} moveSection={moveSection} duplicateSection={duplicateSection} deleteSection={deleteSection} uploadImage={uploadImage}/>} 
      </aside>
    </div>

    {showLibrary&&<div className="wb-modal-backdrop" onMouseDown={()=>setShowLibrary(false)}><div className="wb-modal" onMouseDown={event=>event.stopPropagation()}><div className="wb-modal-head"><div><small>ABSCHNITT HINZUFÜGEN</small><h2>Was möchtest du bauen?</h2></div><button onClick={()=>setShowLibrary(false)}>×</button></div><div className="wb-library">{sectionTypes.map(item=><button key={item.type} onClick={()=>addSection(item.type)}><span>{item.glyph}</span><div><b>{item.label}</b><small>{item.desc}</small></div></button>)}</div></div></div>}

    {showNewPage&&<div className="wb-modal-backdrop" onMouseDown={()=>setShowNewPage(false)}><div className="wb-modal wb-new-page" onMouseDown={event=>event.stopPropagation()}><div className="wb-modal-head"><div><small>NEUE SEITE</small><h2>Wie soll sie heißen?</h2></div><button onClick={()=>setShowNewPage(false)}>×</button></div><label className="wb-simple-field"><span>Seitenname</span><input autoFocus value={newPageName} onChange={event=>setNewPageName(event.target.value)} onKeyDown={event=>{if(event.key==="Enter")createPage()}} placeholder="z. B. Probetraining"/></label><div className="wb-modal-actions"><button className="cms-button secondary" onClick={()=>setShowNewPage(false)}>Abbrechen</button><button className="cms-button" onClick={createPage}>Seite erstellen</button></div></div></div>}
  </AdminShell>;
}

function PageInspector({page,patchPage,duplicatePage,deletePage}:{page:BuilderPage;patchPage:(patch:Partial<BuilderPage>)=>void;duplicatePage:()=>void;deletePage:()=>void}){
  return <><InspectorHead eyebrow="SEITE" title={page.name}/><div className="wb-inspector-body"><div className="wb-publish-card"><div><span className={page.enabled?"live":""}/><div><b>{page.enabled?"Veröffentlicht":"Entwurf"}</b><small>{page.enabled?"Diese Seite ist live.":"Änderungen sind noch nicht öffentlich."}</small></div></div><label className="wb-switch"><input type="checkbox" checked={page.enabled} onChange={event=>patchPage({enabled:event.target.checked})}/><span/></label></div><Field label="Seitenname"><input value={page.name} onChange={event=>patchPage({name:event.target.value})}/></Field><Field label="URL"><div className="wb-url-field"><span>/</span><input value={page.slug} disabled={page.slug===""} onChange={event=>patchPage({slug:slugify(event.target.value)})}/></div></Field><Field label="Navigation"><input value={page.navLabel} onChange={event=>patchPage({navLabel:event.target.value})}/></Field><label className="wb-check"><input type="checkbox" checked={page.showInNav} onChange={event=>patchPage({showInNav:event.target.checked})}/> In Hauptnavigation anzeigen</label><div className="wb-inspector-actions"><button onClick={duplicatePage}>Seite duplizieren</button>{page.slug!==""&&<button className="danger" onClick={deletePage}>Seite löschen</button>}</div></div></>;
}

function ThemeInspector({state,setState}:{state:SiteBuilderState;setState:(value:SiteBuilderState)=>void}){
  const colors:Array<[keyof SiteBuilderState["theme"],string]>=[["background","Website Hintergrund"],["surface","Flächen"],["text","Text"],["muted","Sekundärtext"],["accent","Rascals Akzent"],["headerBackground","Header Hintergrund"],["headerText","Header Text"]];
  return <><InspectorHead eyebrow="GLOBAL" title="Website Design"/><div className="wb-inspector-body"><p className="wb-help">Globale Farben gelten für alle Builder-Seiten. Einzelne Abschnitte können sie überschreiben.</p><div className="wb-color-stack">{colors.map(([key,label])=><label key={key}><span>{label}</span><div><input type="color" value={String(state.theme[key])} onChange={event=>setState({...state,theme:{...state.theme,[key]:event.target.value}})}/><code>{String(state.theme[key])}</code></div></label>)}</div><details className="wb-details"><summary>Layout</summary><div><Field label="Inhaltsbreite"><input type="number" min={800} max={2200} step={20} value={state.theme.contentWidth} onChange={event=>setState({...state,theme:{...state.theme,contentWidth:Number(event.target.value)}})}/></Field><Field label="Standard Radius"><input type="number" min={0} max={40} value={state.theme.radius} onChange={event=>setState({...state,theme:{...state.theme,radius:Number(event.target.value)}})}/></Field></div></details></div></>;
}

function SectionInspector({section,media,uploading,tab,setTab,patchSection,patchStyle,patchItem,addItem,deleteItem,moveSection,duplicateSection,deleteSection,uploadImage}:{section:BuilderSection;media:MediaItem[];uploading:boolean;tab:InspectorTab;setTab:(tab:InspectorTab)=>void;patchSection:(patch:Partial<BuilderSection>)=>void;patchStyle:<K extends keyof BuilderSection["style"]>(key:K,value:BuilderSection["style"][K])=>void;patchItem:(id:string,patch:Partial<BuilderItem>)=>void;addItem:()=>void;deleteItem:(id:string)=>void;moveSection:(direction:-1|1)=>void;duplicateSection:()=>void;deleteSection:()=>void;uploadImage:(event:ChangeEvent<HTMLInputElement>,apply:(url:string)=>void)=>Promise<void>}){
  const hasItems=itemTypes.has(section.type);
  return <><InspectorHead eyebrow="ABSCHNITT" title={typeLabel(section.type)} actions={<><button onClick={()=>moveSection(-1)} title="Nach oben">↑</button><button onClick={()=>moveSection(1)} title="Nach unten">↓</button></>}/><div className="wb-inspector-tabs"><button className={tab==="content"?"active":""} onClick={()=>setTab("content")}>Inhalt</button><button className={tab==="design"?"active":""} onClick={()=>setTab("design")}>Design</button>{hasItems&&<button className={tab==="items"?"active":""} onClick={()=>setTab("items")}>Elemente</button>}</div><div className="wb-inspector-body">
    <div className="wb-visible-row"><div><b>Sichtbar</b><small>Abschnitt auf der Seite anzeigen</small></div><label className="wb-switch"><input type="checkbox" checked={section.visible} onChange={event=>patchSection({visible:event.target.checked})}/><span/></label></div>
    {tab==="content"&&<ContentPanel section={section} media={media} uploading={uploading} patchSection={patchSection} uploadImage={uploadImage}/>} 
    {tab==="design"&&<DesignPanel section={section} patchStyle={patchStyle}/>} 
    {tab==="items"&&hasItems&&<ItemsPanel section={section} media={media} uploading={uploading} patchItem={patchItem} addItem={addItem} deleteItem={deleteItem} uploadImage={uploadImage}/>} 
    <div className="wb-inspector-actions"><button onClick={duplicateSection}>Duplizieren</button><button className="danger" onClick={deleteSection}>Löschen</button></div>
  </div></>;
}

function ContentPanel({section,media,uploading,patchSection,uploadImage}:{section:BuilderSection;media:MediaItem[];uploading:boolean;patchSection:(patch:Partial<BuilderSection>)=>void;uploadImage:(event:ChangeEvent<HTMLInputElement>,apply:(url:string)=>void)=>Promise<void>}){
  return <div className="wb-panel-stack">{section.type!=="spacer"&&<><Field label="Kleine Überschrift"><input value={section.eyebrow||""} onChange={event=>patchSection({eyebrow:event.target.value})}/></Field><Field label="Überschrift"><textarea rows={2} value={section.title||""} onChange={event=>patchSection({title:event.target.value})}/></Field>{!dynamicTypes.has(section.type)&&<Field label="Akzent"><input value={section.accent||""} onChange={event=>patchSection({accent:event.target.value})} placeholder="Optional, z. B. RASCALS."/></Field>}<Field label="Text"><textarea rows={4} value={section.text||""} onChange={event=>patchSection({text:event.target.value})}/></Field></>}
    {(section.type==="hero"||section.type==="split")&&<MediaField label="Bild" value={section.image||""} media={media} uploading={uploading} onChange={url=>patchSection({image:url})} onUpload={(event)=>uploadImage(event,url=>patchSection({image:url}))}/>} 
    {(section.type==="hero"||section.type==="split"||section.type==="cta"||section.type==="text")&&<div className="wb-field-pair"><Field label="Button"><input value={section.buttonLabel||""} onChange={event=>patchSection({buttonLabel:event.target.value})}/></Field><Field label="Link"><input value={section.buttonUrl||""} onChange={event=>patchSection({buttonUrl:event.target.value})}/></Field></div>}
    {dynamicTypes.has(section.type)&&<div className="wb-info-card"><b>Dynamischer Inhalt</b><p>{section.type==="games"?"Spiele und Ergebnisse kommen automatisch aus dem Game Center.":section.type==="news"?"Beiträge kommen automatisch aus dem News-Bereich.":"Partner kommen automatisch aus dem Sponsoren-Bereich."}</p></div>}
  </div>;
}

function DesignPanel({section,patchStyle}:{section:BuilderSection;patchStyle:<K extends keyof BuilderSection["style"]>(key:K,value:BuilderSection["style"][K])=>void}){
  return <div className="wb-panel-stack"><div className="wb-color-stack">{([["background","Hintergrund"],["textColor","Text"],["accentColor","Akzent"]] as const).map(([key,label])=><label key={key}><span>{label}</span><div><input type="color" value={section.style[key]||"#000000"} onChange={event=>patchStyle(key,event.target.value)}/><code>{section.style[key]}</code></div></label>)}</div><Field label="Ausrichtung"><div className="wb-segmented">{(["left","center","right"] as const).map(value=><button key={value} className={section.style.align===value?"active":""} onClick={()=>patchStyle("align",value)}>{value==="left"?"Links":value==="center"?"Mitte":"Rechts"}</button>)}</div></Field><div className="wb-field-pair"><Field label="Abstand oben"><input type="number" min={0} max={300} value={section.style.paddingTop??64} onChange={event=>patchStyle("paddingTop",Number(event.target.value))}/></Field><Field label="Abstand unten"><input type="number" min={0} max={300} value={section.style.paddingBottom??64} onChange={event=>patchStyle("paddingBottom",Number(event.target.value))}/></Field></div><Field label="Mindesthöhe"><input type="number" min={0} max={1200} step={10} value={section.style.minHeight??0} onChange={event=>patchStyle("minHeight",Number(event.target.value))}/></Field><details className="wb-details"><summary>Weitere Einstellungen</summary><div><Field label="Inhaltsbreite"><input type="number" min={320} max={2200} step={20} value={section.style.maxWidth??1600} onChange={event=>patchStyle("maxWidth",Number(event.target.value))}/></Field><Field label="Eckenradius"><input type="number" min={0} max={80} value={section.style.rounded??0} onChange={event=>patchStyle("rounded",Number(event.target.value))}/></Field><Field label="Rahmen"><input value={section.style.border||""} onChange={event=>patchStyle("border",event.target.value)} placeholder="z. B. #e7192d"/></Field></div></details></div>;
}

function ItemsPanel({section,media,uploading,patchItem,addItem,deleteItem,uploadImage}:{section:BuilderSection;media:MediaItem[];uploading:boolean;patchItem:(id:string,patch:Partial<BuilderItem>)=>void;addItem:()=>void;deleteItem:(id:string)=>void;uploadImage:(event:ChangeEvent<HTMLInputElement>,apply:(url:string)=>void)=>Promise<void>}){
  return <div className="wb-items-editor">{section.items.map((item,index)=><details className="wb-item-editor" key={item.id} open={section.items.length<=4}><summary><span>{String(index+1).padStart(2,"0")}</span><b>{item.title||"Element"}</b><button onClick={event=>{event.preventDefault();deleteItem(item.id)}}>×</button></summary><div><Field label="Titel"><input value={item.title||""} onChange={event=>patchItem(item.id,{title:event.target.value})}/></Field><Field label="Zusatz / Label"><input value={item.subtitle||""} onChange={event=>patchItem(item.id,{subtitle:event.target.value})}/></Field><Field label="Wert / Punkte"><input value={item.value||""} onChange={event=>patchItem(item.id,{value:event.target.value})}/></Field><Field label="Text"><textarea rows={3} value={item.text||""} onChange={event=>patchItem(item.id,{text:event.target.value})}/></Field>{(section.type==="cards"||section.type==="timeline")&&<Field label="Symbol"><div className="wb-icon-select"><select value={item.icon||""} onChange={event=>patchItem(item.id,{icon:event.target.value})}><option value="">Kein Symbol</option>{iconLibrary.map(([label,url])=><option key={url} value={url}>{label}</option>)}</select>{item.icon&&<img src={item.icon} alt=""/>}</div></Field>}{(section.type==="cards"||section.type==="gallery")&&<MediaField label="Bild" value={item.image||""} media={media} uploading={uploading} onChange={url=>patchItem(item.id,{image:url})} onUpload={event=>uploadImage(event,url=>patchItem(item.id,{image:url}))}/>}</div></details>)}<button className="wb-add-item" onClick={addItem}>＋ Element hinzufügen</button></div>;
}

function MediaField({label,value,media,uploading,onChange,onUpload}:{label:string;value:string;media:MediaItem[];uploading:boolean;onChange:(url:string)=>void;onUpload:(event:ChangeEvent<HTMLInputElement>)=>void}){
  return <Field label={label}><div className="wb-media-field"><div className="wb-media-preview">{value?<img src={value} alt=""/>:<span>Kein Bild</span>}</div><select value={value} onChange={event=>onChange(event.target.value)}><option value="">Kein Bild</option>{value&&!media.some(item=>item.url===value)&&<option value={value}>Aktuelles Bild</option>}{media.map(item=><option key={item.key} value={item.url}>{item.key.split("/").pop()}</option>)}</select><label className="wb-upload"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" disabled={uploading} onChange={onUpload}/>{uploading?"Upload läuft…":"Neues Bild hochladen"}</label></div></Field>;
}

function InspectorHead({eyebrow,title,actions}:{eyebrow:string;title:string;actions?:React.ReactNode}){return <div className="wb-inspector-head"><div><small>{eyebrow}</small><h2>{title}</h2></div>{actions&&<div>{actions}</div>}</div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="wb-field"><span>{label}</span>{children}</label>}
