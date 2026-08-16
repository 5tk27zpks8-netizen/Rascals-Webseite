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
  if(!option){option=document.createElement("option");option.value=value;option.text="Aktuelle Bildposition";select.appendChild(option)}
  const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")?.set;
  setter?.call(select,value);
  select.dispatchEvent(new Event("change",{bubbles:true}));
}

function editableDocuments(){
  const docs:Document[]=[document];
  document.querySelectorAll<HTMLIFrameElement>(".studio4-preview-stage iframe").forEach(frame=>{try{if(frame.contentDocument)docs.push(frame.contentDocument)}catch{/* same-origin preview expected */}});
  return docs;
}
function applyLiveFocus(url:string,x:number,y:number){
  editableDocuments().forEach(doc=>doc.querySelectorAll<HTMLImageElement>("img[src]").forEach(img=>{if(sameImage(img.getAttribute("src")||"",url))img.style.objectPosition=`${x}% ${y}%`}));
}

function markLegacyControls(mediaNode:HTMLElement){
  const field=mediaNode.closest<HTMLElement>(".studio4-field");
  if(!field)return;
  field.classList.add("has-universal-focus");
  let sibling=field.nextElementSibling as HTMLElement|null;
  let hops=0;
  while(sibling&&hops<6){
    const label=sibling.matches(".studio4-field")?sibling.querySelector<HTMLElement>(":scope > span")?.textContent?.trim()||"":"";
    const divider=sibling.matches(".studio4-divider-label")?sibling.textContent?.trim()||"":"";
    if(label==="Position"||label.startsWith("Horizontal ")||label.startsWith("Vertikal ")||divider==="BILDAUSSCHNITT")sibling.classList.add("studio4-legacy-image-position");
    if(divider==="FARBEN & FORM")break;
    sibling=sibling.nextElementSibling as HTMLElement|null;
    hops+=1;
  }
}

function Positioner({target}:{target:HTMLElement}){
  const select=target.querySelector("select") as HTMLSelectElement|null;
  const [value,setValue]=useState(select?.value||"");
  const initial=useMemo(()=>parseFocus(value),[value]);
  const [focus,setFocus]=useState(initial);

  useEffect(()=>{markLegacyControls(target)},[target]);
  useEffect(()=>{if(!select)return;const sync=()=>{setValue(select.value);setFocus(parseFocus(select.value))};select.addEventListener("change",sync);return()=>select.removeEventListener("change",sync)},[select]);
  useEffect(()=>{setFocus(parseFocus(value))},[value]);
  if(!select||!value)return null;
  const base=stripFocus(value);

  function point(event:ReactPointerEvent<HTMLDivElement>){const rect=event.currentTarget.getBoundingClientRect();return{x:Math.max(0,Math.min(100,((event.clientX-rect.left)/rect.width)*100)),y:Math.max(0,Math.min(100,((event.clientY-rect.top)/rect.height)*100))}}
  function start(event:ReactPointerEvent<HTMLDivElement>){event.currentTarget.setPointerCapture(event.pointerId);const next=point(event);setFocus(next);applyLiveFocus(base,next.x,next.y)}
  function move(event:ReactPointerEvent<HTMLDivElement>){if(!event.currentTarget.hasPointerCapture(event.pointerId))return;const next=point(event);setFocus(next);applyLiveFocus(base,next.x,next.y)}
  function finish(event:ReactPointerEvent<HTMLDivElement>){const next=point(event);setFocus(next);applyLiveFocus(base,next.x,next.y);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);setSelectValue(select,withFocus(base,next.x,next.y))}
  function reset(){const next={x:50,y:50};setFocus(next);applyLiveFocus(base,50,50);setSelectValue(select,withFocus(base,50,50))}

  return <div className="inline-focus-editor studio4-universal-focus">
    <div className="inline-focus-head"><div><b>Bild positionieren</b><small>Ins Bild klicken oder den Fokuspunkt ziehen. Die Vorschau reagiert direkt.</small></div><button type="button" onClick={reset}>Zentrieren</button></div>
    <div className="inline-focus-stage" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}>
      <img src={base} alt="" style={{objectPosition:`${focus.x}% ${focus.y}%`}} draggable={false}/>
      <span className="inline-focus-target" style={{left:`${focus.x}%`,top:`${focus.y}%`}}><i/></span>
    </div>
    <div className="inline-focus-values"><span>Links/Rechts <b>{Math.round(focus.x)}%</b></span><span>Oben/Unten <b>{Math.round(focus.y)}%</b></span></div>
  </div>
}

export function StudioImagePositionAddon(){
  const [targets,setTargets]=useState<Target[]>([]);
  useEffect(()=>{
    const ids=new WeakMap<HTMLElement,string>();let seq=0;
    const scan=()=>setTargets(Array.from(document.querySelectorAll<HTMLElement>(".studio4-media")).map(node=>{markLegacyControls(node);let id=ids.get(node);if(!id){id=`studio-focus-${++seq}`;ids.set(node,id)}return{node,id}}));
    scan();
    const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return <>{targets.map(target=>createPortal(<Positioner target={target.node}/>,target.node,target.id))}</>;
}
