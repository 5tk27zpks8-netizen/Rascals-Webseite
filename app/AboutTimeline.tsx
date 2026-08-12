"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./about-timeline.css";

const ICONS = {
  football: "https://api.iconify.design/ion/american-football.svg?color=%23ffffff",
  whistle: "https://api.iconify.design/mdi/whistle-outline.svg?color=%23e7192d",
  seasonFootball: "https://api.iconify.design/ion/american-football-outline.svg?color=%23e7192d",
  helmet: "https://api.iconify.design/streamline-ultimate/american-football-helmet.svg?color=%23e7192d",
  trophy: "https://api.iconify.design/bi/trophy.svg?color=%23e7192d",
};

const milestones = [
  { year:"2023", tag:"KICKOFF", league:"AUFBAULIGA", note:"Gründung der Hellenstein Rascals. Der erste Schritt auf unserem Weg.", points:"", icon:ICONS.whistle },
  { year:"2025", tag:"NEXT DOWN", league:"KREISLIGA", note:"Viele Spiele, viele Lektionen und ein Team, das zusammen gewachsen ist.", points:"139 : 137", icon:ICONS.seasonFootball },
  { year:"2026", tag:"MOVING THE CHAINS", league:"KREISOBERLIGA", note:"Mehr Erfahrung, mehr Wille, mehr Team. Der verdiente Aufstieg in die Kreisoberliga.", points:"170 : 66", icon:ICONS.helmet },
  { year:"2027", tag:"NEXT LEVEL", league:"BEZIRKSLIGA", note:"Unser nächstes Ziel: die Bezirksliga. Wir arbeiten. Wir glauben. Wir werden bereit sein.", points:"", icon:ICONS.trophy },
];

export function AboutTimeline(){
  const [target,setTarget]=useState<Element|null>(null);
  useEffect(()=>{
    const manifesto=document.querySelector(".manifesto");
    if(!manifesto?.parentElement)return;
    const host=document.createElement("div");
    host.className="rascals-history-host";
    manifesto.insertAdjacentElement("afterend",host);
    setTarget(host);
    return()=>host.remove();
  },[]);
  if(!target)return null;
  return createPortal(
    <section className="rascals-history" aria-labelledby="rascals-history-title">
      <div className="rascals-history-title">
        <span>UNSERE REISE.</span>
        <h2 id="rascals-history-title">FROM FIRST SNAP TO NEXT LEVEL<span>.</span></h2>
      </div>
      <div className="history-drive">
        <div className="drive-arrow" aria-hidden="true"/>
        {milestones.map((item,index)=><article className={`history-stop ${index===milestones.length-1?"next":""}`} key={item.year}>
          <strong>{item.year}</strong>
          <div className="history-ball"><img src={ICONS.football} alt=""/></div>
          <small>{item.tag}</small>
          <h3>{item.league}</h3>
          {item.points&&<div className="history-points"><span>POINTS</span><b>{item.points}</b></div>}
          <div className="history-symbol"><img src={item.icon} alt=""/></div>
          <p>{item.note}</p>
        </article>)}
      </div>
    </section>,target
  )
}
