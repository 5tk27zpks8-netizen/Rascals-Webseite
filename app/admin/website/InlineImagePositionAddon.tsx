"use client";

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import "./inline-image-position.css";

type Target={node:HTMLElement;id:string};

function stripFocus(value:string){return value.replace(/#focus=\d+(?:\.\d+)?,\d+(?:\.\d+)?$/i,"").replace(/#pos-[a-z-]+$/i,"")}
function parseFocus(value:string){
  const precise=value.match(/#focus=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/i);
  if(precise)return{x:Number(precise[1]),y:Number(precise[2])};
  const legacy=value.match(/#pos-([a-z-]+)$/i)?.[1]||"";
  const map:Record<string,{x:number;y:number}>={"top-left":{x:0,y:0},top:{x:50,y:0},"top-right":{x:100,y:0},left:{x:0,y:50},center:{x:50,y:50},right:{x:100,y:50},"bottom-left":{x:0,y:100},bottom:{x:50,y:100},"bottom-right":{x:100,y:100}};
  return map[legacy]||{x:50,y:50};
}
function withFocus(value:string,x:number,y:number){return `${stripFocus(value)}#focus=${Math.round(x*10)/10},${Math.round(y*10)/10}`}
function sameImage(a:string,b:string){return stripFocus(a)===stripFocus(b)}
function setSelectValue(select:HTMLSelectElement,value:string){
  let option=Array.from(select.options).find(item=>item.value===value);
  if(!option){option=document.createElement("option");option.value=value;option.text="Aktuelle Position";select.appendChild(option)}
  const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")?.set;
  setter?.call(select,value);
  select.dispatchEvent(new Event("change",{bubbles:true}));
}
function applyLiveFocus(url:string,x:number,y:number){
  document.querySelectorAll<HTMLImageElement>("img[src]").forEach(img=>{if(sameImage(img.getAttribute("src")||"",url))img.style.objectPosition=`${x}% ${y}%`});
}

function InlinePositioner({target}:{target:HTMLElement}){
  const select=target.querySelector("select") as HTMLSelectElement|null;
  const [value,setValue]=useState(select?.value||"");
  const initial=useMemo(()=>parseFocus(value),[value]);
  const [focus,setFocus]=useState(initial);

  useEffect(()=>{if(!select)return;const sync=()=>{setValue(select.value);setFocus(parseFocus(select.value))};select.addEventListener("change",sync);return()=>select.removeEventListener("change",sync)},[select]);
  useEffect(()=>{setFocus(parseFocus(value))},[value]);
  if(!select||!value)return null;
  const base=stripFocus(value);

  function point(event:ReactPointerEvent<HTMLDivElement>){
    const rect=event.currentTarget.getBoundingClientRect();
    return{x:Math.max(0,Math.min(100,((event.clientX-rect.left)/rect.width)*100)),y:Math.max(0,Math.min(100,((event.clientY-rect.top)/rect.height)*100))};
  }
  function start(event:ReactPointerEvent<HTMLDivElement>){event.currentTarget.setPointerCapture(event.pointerId);const next=point(event);setFocus(next);applyLiveFocus(base,next.x,next.y)}
  function move(event:ReactPointerEvent<HTMLDivElement>){if(!event.currentTarget.hasPointerCapture(event.pointerId))return;const next=point(event);setFocus(next);applyLiveFocus(base,next.x,next.y)}
  function end(event:ReactPointerEvent<HTMLDivElement>){if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);setSelectValue(select,withFocus(base,focus.x,focus.y))}
  function reset(){const next={x:50,y:50};setFocus(next);applyLiveFocus(base,50,50);setSelectValue(select,withFocus(base,50,50))}

  return <div className="inline-focus-editor">
    <div className="inline-focus-head"><div><b>Bild positionieren</b><small>Im Bild klicken und Motiv stufenlos verschieben</small></div><button type="button" onClick={reset}>Zentrieren</button></div>
    <div className="inline-focus-stage" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <img src={base} alt="" style={{objectPosition:`${focus.x}% ${focus.y}%`}} draggable={false}/>
      <span className="inline-focus-target" style={{left:`${focus.x}%`,top:`${focus.y}%`}}><i/></span>
    </div>
    <div className="inline-focus-values"><span>Links/Rechts <b>{Math.round(focus.x)}%</b></span><span>Oben/Unten <b>{Math.round(focus.y)}%</b></span></div>
  </div>
}

export function InlineImagePositionAddon(){
  const [targets,setTargets]=useState<Target[]>([]);
  useEffect(()=>{
    let seq=0;
    const scan=()=>setTargets(Array.from(document.querySelectorAll<HTMLElement>(".wb-media-field")).map(node=>({node,id:node.dataset.focusPortalId||(node.dataset.focusPortalId=`focus-${++seq}-${Math.random().toString(36).slice(2,7)}`)})));
    scan();
    const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return <>{targets.map(target=>createPortal(<InlinePositioner target={target.node}/>,target.node,target.id))}</>;
}
