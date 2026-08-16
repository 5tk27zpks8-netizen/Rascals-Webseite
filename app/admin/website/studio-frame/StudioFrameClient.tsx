"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { SiteBuilderPage } from "../../../SiteBuilderPage";
import type { BuilderSection, SiteBuilderState } from "../../../lib/site-builder";
import { isLegacyFullBleed } from "../../../lib/site-builder-media";
import "./studio-frame.css";

type FrameMessage={type:"rascals-studio-state";state:SiteBuilderState;pageId:string}|{type:string};
type Selection={sectionId?:string;elementKey?:string;theme?:"header"|"footer"};

function findPreviousSection(state:SiteBuilderState|null,pageId:string,section:BuilderSection){
  const page=state?.pages.find(candidate=>candidate.id===pageId)||state?.pages.find(candidate=>candidate.sections.some(item=>item.id===section.id));
  return page?.sections.find(candidate=>candidate.id===section.id);
}

export function StudioFrameClient(){
  const[state,setState]=useState<SiteBuilderState|null>(null);
  const[pageId,setPageId]=useState("");
  const[revision,setRevision]=useState(0);
  const[selected,setSelected]=useState<Selection>({});
  const rootRef=useRef<HTMLDivElement>(null);
  const rawStateRef=useRef<SiteBuilderState|null>(null);
  const canonicalMediaRef=useRef(new Map<string,string>());

  useEffect(()=>{
    const onMessage=(event:MessageEvent<FrameMessage>)=>{
      if(event.origin!==window.location.origin)return;
      if(event.data?.type!=="rascals-studio-state")return;

      const rawIncoming=structuredClone(event.data.state);
      const previewState=structuredClone(rawIncoming);

      for(const page of previewState.pages){
        for(const section of page.sections){
          if(!isLegacyFullBleed(section)||(section.style.backgroundMode||"color")!=="image")continue;

          const previous=findPreviousSection(rawStateRef.current,page.id,section);
          const image=section.image||"";
          const background=section.style.backgroundImage||"";
          let canonical=canonicalMediaRef.current.get(section.id)||image||background;

          if(image===background){
            canonical=image;
          }else if(previous){
            const imageChanged=image!==(previous.image||"");
            const backgroundChanged=background!==(previous.style.backgroundImage||"");
            if(imageChanged&&!backgroundChanged)canonical=image;
            else if(backgroundChanged&&!imageChanged)canonical=background;
            else if(imageChanged&&backgroundChanged)canonical=image||background||canonical;
            // If neither changed, keep the already chosen canonical image. This
            // prevents an unrelated text/color edit from restoring a stale URL.
          }else{
            canonical=image||background||canonical;
          }

          if(canonical){
            section.image=canonical;
            section.style.backgroundImage=canonical;
            canonicalMediaRef.current.set(section.id,canonical);
          }
        }
      }

      rawStateRef.current=rawIncoming;
      setState(previewState);
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
