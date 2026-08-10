"use client";

type Depth={position:string;positionGroup:string;rank:number;playerId:string;firstName:string;lastName:string;jerseyNumber:number|null;availability:string};
type Slot={slotKey:string;positionLabel:string;positionGroup:string};
type Row={slot:Slot;base:Depth|null;selected:Depth|null;list:Depth[];baseRating:number|null;simRating:number|null;delta:number|null};
type Rating={playerId:string;compositeRating:number|null;performanceRating:number|null;skillRating:number|null};

function playerName(p:Depth|null){return p?`#${p.jerseyNumber??"–"} ${p.firstName} ${p.lastName}`:"kein Spieler"}
function availability(v:string){const s=v.toLowerCase();return s==="full"?"voll verfügbar":s==="limited"?"eingeschränkt":s==="injured"?"verletzt":v}

export function LineupRecommendations({rows,ratings,forcedOut,optimized}:{rows:Row[];ratings:Rating[];forcedOut:Set<string>;optimized:boolean}){
  const rating=(id:string)=>ratings.find(r=>r.playerId===id)?.compositeRating??null;
  const recommendations=rows.map(row=>{
    if(!row.selected)return {priority:100,title:`${row.slot.positionLabel||row.slot.slotKey}: Besetzung offen`,decision:"Keine belastbare Besetzung verfügbar.",why:"Der Slot bleibt in der aktuellen Simulation unbesetzt.",tradeoff:"Depth Chart bzw. Cross-Training prüfen.",tone:"critical"};
    const changed=row.base?.playerId!==row.selected.playerId;
    const movedFrom=rows.find(other=>other.slot.slotKey!==row.slot.slotKey&&other.base?.playerId===row.selected?.playerId);
    const availableBackups=row.list.filter(p=>p.playerId!==row.selected?.playerId&&!forcedOut.has(p.playerId)&&!["out","return-to-play","inactive","unavailable"].includes(p.availability.toLowerCase()));
    const backupQuality=availableBackups.map(p=>rating(p.playerId)).filter((v):v is number=>v!=null).sort((a,b)=>b-a)[0]??null;
    const delta=row.delta;
    const positive=delta!=null&&delta>0;
    const availabilityRisk=row.selected.availability.toLowerCase()!=="full";
    const priority=(changed?35:0)+(positive?Math.min(30,delta!*3):0)+(availabilityRisk?25:0)+(availableBackups.length===0?30:availableBackups.length===1?12:0)+(movedFrom?18:0);
    const decision=changed?`${playerName(row.selected)} statt ${playerName(row.base)} einsetzen.`:`${playerName(row.selected)} als aktuelle Besetzung beibehalten.`;
    const why=delta==null?`Für ${row.slot.positionLabel||row.slot.slotKey} fehlt noch eine vollständige Bewertungsbasis.`:delta>0?`Die Simulation gewinnt ${delta} Rating-Punkt${delta===1?"":"e"} auf diesem Slot.`:delta<0?`Die Simulation verliert ${Math.abs(delta)} Rating-Punkt${delta===-1?"":"e"}; der Wechsel ist nur durch Verfügbarkeit oder Gesamt-Lineup sinnvoll.`:"Kein messbarer Rating-Unterschied zur aktuellen Besetzung.";
    const tradeParts:string[]=[];
    if(movedFrom)tradeParts.push(`${row.selected.lastName} ist im aktuellen Depth Chart außerdem Basis-Spieler auf ${movedFrom.slot.positionLabel||movedFrom.slot.slotKey}.`);
    if(availabilityRisk)tradeParts.push(`Availability: ${availability(row.selected.availability)}.`);
    if(availableBackups.length===0)tradeParts.push("Danach kein verfügbarer Backup auf diesem Slot.");
    else tradeParts.push(`${availableBackups.length} Replacement${availableBackups.length===1?"":"s"} verbleiben${backupQuality!=null?`, bestes Backup-Rating ${backupQuality}`:""}.`);
    return {priority,title:`${row.slot.positionLabel||row.slot.slotKey}: ${changed?"Wechsel prüfen":"stabil"}`,decision,why,tradeoff:tradeParts.join(" "),tone:availabilityRisk||availableBackups.length===0||(!positive&&changed)?"watch":positive&&changed?"positive":"stable"};
  }).sort((a,b)=>b.priority-a.priority);

  const actionable=recommendations.filter(r=>r.priority>0).slice(0,6);
  return <section className="lr-panel">
    <div className="lr-head"><div><small>LINEUP RECOMMENDATIONS</small><h3>Coach Decision Support</h3></div><span>{optimized?"Best-Lineup erklärt":"Simulation erklärt"}</span></div>
    <p className="lr-intro">Die Empfehlung trennt Leistungsgewinn, Availability und Depth-Trade-offs. Sie verändert keine produktiven Aufstellungsdaten.</p>
    <div className="lr-grid">{actionable.length?actionable.map((r,i)=><article className={`lr-card ${r.tone}`} key={`${r.title}-${i}`}><div className="lr-rank">0{i+1}</div><div><strong>{r.title}</strong><b>{r.decision}</b><p>{r.why}</p><small>{r.tradeoff}</small></div></article>):<article className="lr-empty">Keine relevante Abweichung erkannt. Das aktuelle Lineup ist unter den verfügbaren Daten stabil.</article>}</div>
  </section>
}
