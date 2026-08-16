"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { SiteBuilderPage } from "../../../SiteBuilderPage";
import type { SiteBuilderState } from "../../../lib/site-builder";
import { reconcileSiteBuilderMedia } from "../../../lib/site-builder-media";
import "./studio-frame.css";

type FrameMessage={type:"rascals-studio-state";state:SiteBuilderState;pageId:string}|{type:string};
type Selection={sectionId?:string;elementKey?:string;theme?:"header"|"footer"};

export function StudioFrameClient(){
  const[state,setState]=useState<SiteBuilderState|null>(null);
  const[pageId,setPageId]=useState("");
  const[revision,setRevision]=useState(0);
  const[selected,setSelected]=useState<Selection>({});
  const rootRef=useRef<HTMLDivElement>(null);
  const rawStateRef=useRef<SiteBuilderState|null>(null);

  useEffect(()=>{
    const onMessage=(event:MessageEvent<FrameMessage>)=>{
      if(event.origin!==window.location.origin)return;
      if(event.data?.type!=="rascals-studio-state")return;
      // Compare against the previous RAW editor snapshot, not the already
      // reconciled preview state. Otherwise a second unrelated edit could make
      // an old background URL look like a new change and visually revert a
      // freshly uploaded image before Save/Publish.
      const rawIncoming=structuredClone(event.data.state);
      const reconciled=reconcileSiteBuilderMedia(rawStateRef.current??undefined,rawIncoming);
      rawStateRef.current=rawIncoming;
      setState(reconciled);
      setPageId(event.data.pageId);
      setRevision(value=>value+1);
    };
    window.addEventListener("message",onMessage);
    window.parent.postMessage({type:"rascals-studio-ready"},window.location.origin);
    return()=>window.removeEventListener("message",onMessage);
  },[]);

  useEffect(()=>{
    const root=rootRef.current;if(!root)return;
    let raf=0;
    const sendHeight=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const height=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,root.getBoundingClientRect().height);window.parent.postMessage({type:"rascals-studio-height",height:Math.ceil(height)},window.location.origin)})};
    sendHeight();const resize=new ResizeObserver(sendHeight);resize.observe(root);resize.observe(document.body);const mutation=new MutationObserver(sendHeight);mutation.observe(root,{subtree:true,childList:true,attributes:true,characterData:true});window.setTimeout(sendHeight,80);window.setTimeout(sendHeight,300);window.setTimeout(sendHeight,900);
    return()=>{cancelAnimationFrame(raf);resize.disconnect();mutation.disconnect()};
  },[revision,pageId]);

  useEffect(()=>{
    const root=rootRef.current;if(!root)return;
    root.querySelectorAll(".studio-frame-selected").forEach(node=>node.classList.remove("studio-frame-selected"));
    let target:HTMLElement|null=null;
    if(selected.theme)target=root.querySelector<HTMLElement>(`[data-builder-theme="${selected.theme}"]`);
    else if(selected.sectionId){const section=root.querySelector<HTMLElement>(`[data-builder-section="${CSS.escape(selected.sectionId)}"]`);target=selected.elementKey?section?.querySelector<HTMLElement>(`[data-builder-element="${CSS.escape(selected.elementKey)}"]`)||section||null:section}
    target?.classList.add("studio-frame-selected");
  },[selected,revision,pageId]);

  const page=state?.pages.find(item=>item.id===pageId)||state?.pages[0];

  function select(event:MouseEvent<HTMLDivElement>){
    event.preventDefault();event.stopPropagation();
    const target=event.target instanceof HTMLElement?event.target:null;if(!target)return;
    const themeNode=target.closest<HTMLElement>("[data-builder-theme]");
    if(themeNode){const theme=themeNode.dataset.builderTheme==="footer"?"footer":"header";setSelected({theme});window.parent.postMessage({type:"rascals-studio-select",theme},window.location.origin);return}
    const element=target.closest<HTMLElement>("[data-builder-element]");const section=target.closest<HTMLElement>("[data-builder-section]");if(!section)return;
    const sectionId=section.dataset.builderSection||"",elementKey=element?.dataset.builderElement||undefined;setSelected({sectionId,elementKey});window.parent.postMessage({type:"rascals-studio-select",sectionId,elementKey},window.location.origin);
  }

  if(!state||!page)return <div className="studio-frame-loading">Vorschau wird geladen…</div>;
  return <div ref={rootRef} className="studio-frame-root" onClickCapture={select} data-studio-revision={revision}><SiteBuilderPage key={`${page.id}-${revision}`} state={state} page={page}/></div>;
}
