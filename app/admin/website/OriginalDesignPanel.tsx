"use client";

import { useState } from "react";
import "./original-design-panel.css";

export function OriginalDesignPanel(){
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");

  async function restoreOriginal(){
    if(!confirm("Das ursprüngliche Rascals Standarddesign als Entwurf laden? Texte, Bilder, Seiten und dynamische Inhalte bleiben erhalten. Nur Design, Farben, Abstände und Abschnittsvarianten werden auf den Original-Look zurückgesetzt."))return;
    setLoading(true);setMessage("");
    try{
      const response=await fetch("/admin/api/site-builder/original",{method:"POST"});
      const body=await response.json().catch(()=>({})) as {error?:string};
      if(!response.ok)throw new Error(body.error||"Originaldesign konnte nicht geladen werden.");
      setMessage("Originaldesign wurde als Entwurf geladen. Die öffentliche Website bleibt unverändert, bis du veröffentlichst.");
      window.setTimeout(()=>window.location.reload(),700);
    }catch(error){setMessage(error instanceof Error?error.message:"Originaldesign konnte nicht geladen werden.")}
    finally{setLoading(false)}
  }

  return <section className="original-design-panel">
    <div className="original-design-copy">
      <small>AKTUELLES / URSPRÜNGLICHES DESIGN</small>
      <h2>RASCALS STANDARD</h2>
      <p>Das ursprüngliche Website-Design bleibt dauerhaft als geschützte Standardvorlage hinterlegt. Die Vorschau zeigt die aktuell veröffentlichte Website. Du kannst jederzeit auf den ursprünglichen Look zurückgehen, ohne Texte, Bilder, Spielplan, News oder Sponsoren zu verlieren.</p>
      <div className="original-design-actions"><a href="/" target="_blank" rel="noreferrer">Live-Website öffnen ↗</a><button onClick={()=>void restoreOriginal()} disabled={loading}>{loading?"Wird geladen…":"Originaldesign in Editor laden"}</button></div>
      {message&&<span className="original-design-message">{message}</span>}
    </div>
    <div className="original-live-frame"><div className="original-browser-bar"><i/><span>Aktuelle Website</span><b>LIVE</b></div><iframe src="/" title="Aktuelle Rascals Website"/></div>
  </section>
}
