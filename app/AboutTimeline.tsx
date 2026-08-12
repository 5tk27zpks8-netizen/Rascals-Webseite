"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./about-timeline.css";

const milestones = [
  { year:"2023", tag:"KICKOFF", league:"AUFBAULIGA", note:"Gründung der Hellenstein Rascals. Der erste Schritt auf unserem Weg.", points:"", icon:"whistle" },
  { year:"2025", tag:"NEXT DOWN", league:"KREISLIGA", note:"Viele Spiele, viele Lektionen und ein Team, das zusammen gewachsen ist.", points:"139 : 137", icon:"football" },
  { year:"2026", tag:"MOVING THE CHAINS", league:"KREISOBERLIGA", note:"Mehr Erfahrung, mehr Wille, mehr Team. Der verdiente Aufstieg in die Kreisoberliga.", points:"170 : 66", icon:"pads" },
  { year:"2027", tag:"NEXT LEVEL", league:"BEZIRKSLIGA", note:"Unser nächstes Ziel: die Bezirksliga. Wir arbeiten. Wir glauben. Wir werden bereit sein.", points:"", icon:"trophy" },
];

function Football({ red=false }:{red?:boolean}) {
  return <svg className={`real-football ${red?"red":""}`} viewBox="0 0 120 72" aria-hidden="true"><path d="M10 36C25 7 53 0 84 8c15 4 23 13 26 28-12 24-35 34-61 27C29 58 17 49 10 36Z"/><path className="fb-stripe" d="M28 18c8 12 8 24 0 36M91 16c-7 12-7 27 0 39"/><path className="fb-lace" d="M43 36h36M49 27v18M58 25v21M68 25v21M77 28v17"/></svg>;
}

function Symbol({type}:{type:string}) {
  if(type==="football") return <svg className="history-svg" viewBox="0 0 120 80"><path d="M12 42C28 12 58 4 91 15c11 4 17 12 19 23-13 25-38 35-65 28C27 61 17 53 12 42Z"/><path d="M42 41h39M49 31v20M59 29v23M69 29v23M79 32v18"/></svg>;
  if(type==="trophy") return <svg className="history-svg trophy-svg" viewBox="0 0 120 120"><path d="M37 14h46v20c0 26-11 39-23 39S37 60 37 34V14Z"/><path d="M37 24H20v12c0 16 10 25 24 25M83 24h17v12c0 16-10 25-24 25M60 73v20M42 104h36M49 93h22"/><path d="m60 28 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2 5-10Z"/></svg>;
  if(type==="pads") return <svg className="history-svg" viewBox="0 0 130 100"><path d="M16 28c12-13 26-17 41-15l8 19 8-19c15-2 29 2 41 15l-7 52-28 8-14-22-14 22-28-8-7-52Z"/><path d="M25 35c10 1 18 5 25 13M105 35c-10 1-18 5-25 13M65 32v34"/></svg>;
  return <svg className="history-svg" viewBox="0 0 120 90"><path d="M22 43h43c15 0 26 9 26 20H53c-20 0-31-8-31-20Z"/><circle cx="72" cy="52" r="9"/><path d="M91 48h17l-8 13H90M29 43l20-19 23 8"/></svg>;
}

export function AboutTimeline(){
 const [target,setTarget]=useState<Element|null>(null);
 useEffect(()=>{const manifesto=document.querySelector(".manifesto");if(!manifesto?.parentElement)return;const host=document.createElement("div");host.className="rascals-history-host";manifesto.insertAdjacentElement("afterend",host);setTarget(host);return()=>host.remove()},[]);
 if(!target)return null;
 return createPortal(<section className="rascals-history" aria-labelledby="rascals-history-title"><div className="rascals-history-title"><span>UNSERE REISE.</span><h2 id="rascals-history-title">FROM FIRST SNAP TO NEXT LEVEL<span>.</span></h2></div><div className="history-drive"><div className="drive-arrow" aria-hidden="true"/>{milestones.map((item,index)=><article className={`history-stop ${index===milestones.length-1?"next":""}`} key={item.year}><strong>{item.year}</strong><div className="history-ball"><Football red={index===milestones.length-1}/></div><small>{item.tag}</small><h3>{item.league}</h3>{item.points&&<div className="history-points"><span>POINTS</span><b>{item.points}</b></div>}<div className="history-symbol"><Symbol type={item.icon}/></div><p>{item.note}</p></article>)}</div></section>,target)
}
