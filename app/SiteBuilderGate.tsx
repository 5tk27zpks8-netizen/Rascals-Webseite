"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SiteBuilderPage } from "./SiteBuilderPage";
import type { SiteBuilderState } from "./lib/site-builder";

export function SiteBuilderGate({ slug, fallback }: { slug: string; fallback: ReactNode }) {
  const [state,setState]=useState<SiteBuilderState|null>(null);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    fetch("/api/public-site-builder")
      .then(r=>r.ok?r.json():null)
      .then(data=>{if(!cancelled&&data)setState(data as SiteBuilderState)})
      .catch(()=>undefined)
      .finally(()=>{if(!cancelled)setLoaded(true)});
    return()=>{cancelled=true};
  },[]);
  if(!loaded)return <>{fallback}</>;
  const normalized=slug.replace(/^\/+|\/+$/g,"").toLowerCase();
  const page=state?.pages.find(p=>p.slug.toLowerCase()===normalized&&p.enabled);
  if(page&&state)return <SiteBuilderPage state={state} page={page}/>;
  return <>{fallback}</>;
}
