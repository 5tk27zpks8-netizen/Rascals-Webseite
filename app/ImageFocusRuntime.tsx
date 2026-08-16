"use client";

import { useEffect } from "react";

function focusFromUrl(value:string){
  const precise=value.match(/#focus=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/i);
  if(precise)return {x:Math.max(0,Math.min(100,Number(precise[1]))),y:Math.max(0,Math.min(100,Number(precise[2])))};
  const legacy=value.match(/#pos-([a-z-]+)$/i)?.[1]||"";
  const map:Record<string,{x:number;y:number}>={"top-left":{x:0,y:0},top:{x:50,y:0},"top-right":{x:100,y:0},left:{x:0,y:50},center:{x:50,y:50},right:{x:100,y:50},"bottom-left":{x:0,y:100},bottom:{x:50,y:100},"bottom-right":{x:100,y:100}};
  return map[legacy]||null;
}

function applyFocus(root:ParentNode=document){
  root.querySelectorAll<HTMLImageElement>("img[src]").forEach(img=>{
    const focus=focusFromUrl(img.getAttribute("src")||"");
    if(focus)img.style.objectPosition=`${focus.x}% ${focus.y}%`;
  });
}

export function ImageFocusRuntime(){
  useEffect(()=>{
    applyFocus();
    const observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==="attributes"&&record.target instanceof HTMLImageElement){applyFocus(record.target.parentNode||document);continue}
        record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)applyFocus(node)});
      }
    });
    observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["src"]});
    return()=>observer.disconnect();
  },[]);
  return null;
}
