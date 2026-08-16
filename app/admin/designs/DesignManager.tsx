"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminNotice, AdminShell } from "../_components/AdminShell";
import type { BuilderPage, SiteBuilderState } from "../../lib/site-builder";
import { applyDesignPreset, builtInDesignPresets, capturePageDesign, type DesignPreset } from "../../lib/design-presets";
import { DesignWebsitePreview } from "./DesignWebsitePreview";
import "./designs.css";

type SaveStatus="idle"|"saving"|"done";
const uid=()=>`design-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

export function DesignManager(){
  const[state,setState]=useState<SiteBuilderState|null>(null);
  const[custom,setCustom]=useState<DesignPreset[]>([]);
  const[pageId,setPageId]=useState("");
  const[filter,setFilter]=useState<"all"|"built-in"|"custom">("all");
  const[notice,setNotice]=useState("");
  const[status,setStatus]=useState<SaveStatus>("idle");
  const[beforeState,setBeforeState]=useState<SiteBuilderState|null>(null);
  const[showSave,setShowSave]=useState(false);
  const[designName,setDesignName]=useState("");
  const[designDescription,setDesignDescription]=useState("");

  useEffect(()=>{void load()},[]);
  async function load(){setNotice("");try{const[builderRes,designRes]=await Promise.all([fetch("/admin/api/site-builder"),fetch("/admin/api/design-presets")]);if(!builderRes.ok)throw new Error("Website konnte nicht geladen werden.");const builderBody=await builderRes.json() as{state:SiteBuilderState};const designBody=designRes.ok?await designRes.json() as{items:DesignPreset[]}:{items:[]};setState(builderBody.state);setCustom(designBody.items||[]);setPageId(builderBody.state.pages[0]?.id||"")}catch(error){setNotice(error instanceof Error?error.message:"Design-Bibliothek konnte nicht geladen werden.")}}
  const page=useMemo<BuilderPage|undefined>(()=>state?.pages.find(item=>item.id===pageId)||state?.pages[0],[state,pageId]);
  const presets=useMemo(()=>filter==="built-in"?builtInDesignPresets:filter==="custom"?custom:[...builtInDesignPresets,...custom],[custom,filter]);

  async function persistBuilder(next:SiteBuilderState){const response=await fetch("/admin/api/site-builder",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(next)});const body=await response.json().catch(()=>({})) as{error?:string};if(!response.ok)throw new Error(body.error||"Änderung konnte nicht als Entwurf gespeichert werden.")}
  async function apply(preset:DesignPreset){if(!state||!page||status==="saving")return;const previous=state;const next=applyDesignPreset(state,page.id,preset);setBeforeState(previous);setState(next);setStatus("saving");setNotice("");try{await persistBuilder(next);setNotice(`„${preset.name}“ wurde als kompletter Website-Entwurf auf „${page.name}“ angewendet. Aufbau, Farben, Typografie und Abschnittsdesign wurden gemeinsam geändert. Inhalte bleiben erhalten.`);setStatus("done");window.setTimeout(()=>setStatus("idle"),1200)}catch(error){setState(previous);setBeforeState(null);setNotice(error instanceof Error?error.message:"Design konnte nicht angewendet werden.");setStatus("idle")}}
  async function undo(){if(!beforeState||status==="saving")return;const restore=beforeState,current=state;setState(restore);setStatus("saving");try{await persistBuilder(restore);setBeforeState(null);setNotice("Letzte Designänderung wurde im Entwurf rückgängig gemacht.")}catch(error){if(current)setState(current);setNotice(error instanceof Error?error.message:"Rückgängig konnte nicht gespeichert werden.")}finally{setStatus("idle")}}
  async function persistCustom(next:DesignPreset[]){const response=await fetch("/admin/api/design-presets",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({items:next})});const body=await response.json().catch(()=>({})) as{error?:string;items?:DesignPreset[]};if(!response.ok)throw new Error(body.error||"Design konnte nicht gespeichert werden.");setCustom(body.items||next)}
  async function saveCurrentDesign(){if(!state||!page||!designName.trim())return;const preset=capturePageDesign(state,page,uid(),designName.trim(),designDescription.trim()||`Gespeichert von ${page.name}`);const next=[preset,...custom];setStatus("saving");setNotice("");try{await persistCustom(next);setShowSave(false);setDesignName("");setDesignDescription("");setFilter("custom");setNotice(`Eigenes Design „${preset.name}“ wurde gespeichert.`)}catch(error){setNotice(error instanceof Error?error.message:"Design konnte nicht gespeichert werden.")}finally{setStatus("idle")}}
  async function removeCustom(id:string){const item=custom.find(preset=>preset.id===id);if(!item||!confirm(`Design „${item.name}“ löschen?`))return;const next=custom.filter(preset=>preset.id!==id);setStatus("saving");try{await persistCustom(next);setNotice(`„${item.name}“ wurde gelöscht.`)}catch(error){setNotice(error instanceof Error?error.message:"Design konnte nicht gelöscht werden.")}finally{setStatus("idle")}}

  if(!state||!page)return <AdminShell active="designs" title="Designs"><div className="design-loading">Design-Bibliothek wird geladen…</div></AdminShell>;
  return <AdminShell active="designs" title="Designs" eyebrow="RASCALS DESIGN LIBRARY" actions={<a className="cms-button secondary" href="/admin/website">Website gestalten</a>}>
    <div className="design-studio">
      <header className="design-hero"><div><small>WEBSITE DESIGNS</small><h2>Vier echte Websites.<br/><span>Vier komplett andere Konzepte.</span></h2><p>Standard, Klassik, Performance und Editorial verändern nicht nur Farben. Jedes Konzept besitzt einen eigenen Seitenaufbau, eigene Abschnittsvarianten, Typografie, Flächenlogik und visuelle Hierarchie.</p></div><div className="design-page-picker"><label><span>Vorschau-Seite</span><select value={page.id} onChange={event=>setPageId(event.target.value)}>{state.pages.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="design-save-own" onClick={()=>{setDesignName(`${page.name} Design`);setDesignDescription("");setShowSave(true)}}>＋ Eigenes Design speichern</button></div></header>
      {notice&&<div className="design-notice-row"><AdminNotice tone={notice.includes("konnte nicht")?"error":"success"}>{notice}</AdminNotice>{beforeState&&<button onClick={()=>void undo()} disabled={status==="saving"}>Rückgängig</button>}</div>}

      <div className="design-section-title"><small>KOMPLETTE KONZEPTE</small><h2>Design auswählen</h2><p>Die Vorschau verwendet deine echten Inhalte, zeigt sie aber bereits im jeweiligen vollständigen Website-Konzept.</p></div>
      <div className="design-filter" role="tablist"><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>Alle</button><button className={filter==="built-in"?"active":""} onClick={()=>setFilter("built-in")}>Rascals Vorlagen</button><button className={filter==="custom"?"active":""} onClick={()=>setFilter("custom")}>Meine Designs <span>{custom.length}</span></button></div>
      <div className="design-grid">{presets.map(preset=><article className={`design-card design-card-concept concept-${preset.id}`} key={preset.id}><div className="design-preview"><DesignWebsitePreview state={state} page={page} preset={preset}/><div className="design-swatches">{preset.palette.slice(0,4).map((color,index)=><span key={`${color}-${index}`} style={{background:color}}/>)}</div></div><div className="design-card-copy"><div className="design-card-title"><div><small>{preset.builtin?"KOMPLETTES WEBSITE DESIGN":"EIGENES DESIGN"}</small><h3>{preset.name}</h3></div>{!preset.builtin&&<button className="design-delete" onClick={()=>void removeCustom(preset.id)}>×</button>}</div><p>{preset.description}</p>{preset.builtin&&<div className="design-concept-meta"><span>Eigener Aufbau</span><span>Eigene Typografie</span><span>Eigene Komponenten</span></div>}<button className="design-apply" disabled={status==="saving"} onClick={()=>void apply(preset)}>{status==="saving"?"Bitte warten…":`${preset.name} als Entwurf übernehmen`} <span>→</span></button></div></article>)}</div>
      {filter==="custom"&&custom.length===0&&<div className="design-empty"><span>＋</span><h3>Noch keine eigenen Designs</h3><p>Gestalte eine Seite im Website Studio und speichere den aktuellen Stand hier als wiederverwendbare Vorlage.</p><button onClick={()=>{setDesignName(`${page.name} Design`);setShowSave(true)}}>Aktuelles Design speichern</button></div>}
    </div>
    {showSave&&<div className="design-modal-backdrop" onMouseDown={()=>setShowSave(false)}><div className="design-modal" onMouseDown={event=>event.stopPropagation()}><div className="design-modal-head"><div><small>EIGENES DESIGN</small><h2>Design speichern</h2></div><button onClick={()=>setShowSave(false)}>×</button></div><p>Gespeichert werden Farben, Abstände, Abschnittsvarianten und Styling der ausgewählten Seite. Deine Inhalte bleiben unabhängig davon bearbeitbar.</p><label><span>Name</span><input autoFocus value={designName} onChange={event=>setDesignName(event.target.value)}/></label><label><span>Beschreibung</span><textarea rows={3} value={designDescription} onChange={event=>setDesignDescription(event.target.value)}/></label><div className="design-modal-actions"><button onClick={()=>setShowSave(false)}>Abbrechen</button><button className="primary" disabled={!designName.trim()||status==="saving"} onClick={()=>void saveCurrentDesign()}>Design speichern</button></div></div></div>}
  </AdminShell>;
}
