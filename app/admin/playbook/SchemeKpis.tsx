"use client";
import {useEffect,useState} from "react";
import type {Unit} from "./playbook-studio-model";

type Card={label:string;value:number|null;suffix?:string;detail:string};
type Payload={cards:Card[];gameCount:number};

export function SchemeKpis({seasonId,unit,teamRating}:{seasonId:string;unit:Unit;teamRating:number|null}){
 const[data,setData]=useState<Payload|null>(null);
 useEffect(()=>{if(!seasonId){setData(null);return}const controller=new AbortController();void(async()=>{try{const r=await fetch(`/admin/api/playbook-kpis?${new URLSearchParams({seasonId,unit})}`,{cache:"no-store",signal:controller.signal});if(r.ok)setData(await r.json() as Payload)}catch{}})();return()=>controller.abort()},[seasonId,unit]);
 const overall=unit==="offense"?"Gesamt Offense Rating":unit==="defense"?"Gesamt Defense Rating":"Special Teams Rating";
 const cards=[{label:overall,value:teamRating,suffix:"",detail:"Live Starter Composite"},...(data?.cards??[])];
 return <section className="pbs-source-kpis" aria-label={`${overall} und Scheme KPIs`}>{cards.slice(0,6).map(card=><article key={card.label}><small>{card.label}</small><b>{card.value==null?"–":`${format(card.value)}${card.suffix??""}`}</b><span>{card.detail}</span></article>)}</section>
}
function format(value:number){return Number.isInteger(value)?String(value):value.toFixed(1)}
