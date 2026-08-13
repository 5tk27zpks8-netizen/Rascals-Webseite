"use client";

import { BuilderSectionView } from "../../SiteBuilderPage";
import type { BuilderPage, SiteBuilderState } from "../../lib/site-builder";
import { applyDesignPreset, type DesignPreset } from "../../lib/design-presets";

export function DesignWebsitePreview({state,page,preset}:{state:SiteBuilderState;page:BuilderPage;preset?:DesignPreset}) {
  const previewState=preset?applyDesignPreset(state,page.id,preset):state;
  const previewPage=previewState.pages.find(item=>item.id===page.id)??page;
  const theme=previewState.theme;
  return <div style={{height:250,overflow:"hidden",background:theme.background,position:"relative",pointerEvents:"none"}}>
    <div style={{width:"200%",transform:"scale(.5)",transformOrigin:"top left",background:theme.background,color:theme.text,minHeight:500,
      ["--site-bg" as string]:theme.background,["--site-text" as string]:theme.text,["--site-accent" as string]:theme.accent,["--site-surface" as string]:theme.surface,["--site-muted" as string]:theme.muted,["--site-max" as string]:`${theme.contentWidth}px`,["--site-radius" as string]:`${theme.radius}px`,["--site-heading-font" as string]:theme.headingFont,["--site-body-font" as string]:theme.bodyFont,["--site-heading-weight" as string]:String(theme.headingWeight),["--site-heading-tracking" as string]:`${theme.headingTracking}em`,["--site-body-line" as string]:String(theme.bodyLineHeight),["--site-heading-transform" as string]:theme.headingTransform} as React.CSSProperties}>
      <div style={{height:62,background:theme.headerBackground,borderBottom:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 42px",color:theme.headerText}}>
        <div style={{display:"flex",alignItems:"center",gap:14,fontWeight:900,fontSize:17}}>{theme.logoUrl&&<img src={theme.logoUrl} alt="" style={{width:44,height:44,objectFit:"contain"}}/>}<span>{theme.brandTop} <i style={{fontStyle:"normal",color:theme.accent}}>{theme.brandBottom}</i></span></div>
        <div style={{display:"flex",gap:24,fontSize:11,fontWeight:800}}>{previewState.pages.filter(item=>item.showInNav).slice(0,5).map(item=><span key={item.id}>{item.navLabel}</span>)}</div>
      </div>
      {previewPage.sections.filter(section=>section.visible).slice(0,5).map(section=><BuilderSectionView key={section.id} section={section}/>)}
    </div>
    <div style={{position:"absolute",inset:0,boxShadow:"inset 0 0 0 1px rgba(255,255,255,.08)"}}/>
  </div>;
}
