"use client";

import { useState, type CSSProperties } from "react";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { DynamicHomeGames } from "./DynamicHomeGames";
import type { BuilderPage, BuilderSection, SiteBuilderState } from "./lib/site-builder";
import "./site-builder.css";

const footballIcon = "https://api.iconify.design/noto/american-football.svg";
const legacySlugs = new Set(["ueber-uns","team","sponsoring","shop","news","galerie"]);

function classVariant(section: BuilderSection) {
  return `sb-variant-${(section.variant || "default").replace(/[^a-z0-9-]/gi,"-").toLowerCase()}`;
}

function modeClass(section: BuilderSection) {
  return `sb-bgmode-${section.style.backgroundMode || "color"}`;
}

function sizeVars(scale:number,prefix:string){
  return {
    [`--sb-h1-min${prefix}`]:`${3.5*scale}rem`,
    [`--sb-h1-fluid${prefix}`]:`${7*scale}vw`,
    [`--sb-h1-max${prefix}`]:`${8*scale}rem`,
    [`--sb-h2-min${prefix}`]:`${2.4*scale}rem`,
    [`--sb-h2-fluid${prefix}`]:`${4.6*scale}vw`,
    [`--sb-h2-max${prefix}`]:`${5.4*scale}rem`,
  };
}

function sectionVars(section: BuilderSection): CSSProperties {
  const tablet=section.style.tablet||{};
  const mobile=section.style.mobile||{};
  const mode=section.style.backgroundMode||"color";
  const desktopScale=section.style.headingScale??1;
  const tabletScale=tablet.headingScale??desktopScale*.9;
  const mobileScale=mobile.headingScale??desktopScale*.72;
  return {
    "--sb-bg": section.style.background || "#050d18",
    "--sb-background": mode==="gradient" ? (section.style.backgroundGradient||section.style.background||"#050d18") : (section.style.background||"#050d18"),
    "--sb-text": section.style.textColor || "#fff",
    "--sb-accent": section.style.accentColor || "#e7192d",
    "--sb-pt": `${section.style.paddingTop ?? 64}px`,
    "--sb-pb": `${section.style.paddingBottom ?? 64}px`,
    "--sb-min": `${section.style.minHeight ?? 0}px`,
    "--sb-max": `${section.style.maxWidth ?? 1600}px`,
    "--sb-radius": `${section.style.rounded ?? 0}px`,
    "--sb-border": section.style.border || "transparent",
    "--sb-pt-tablet": `${tablet.paddingTop ?? section.style.paddingTop ?? 64}px`,
    "--sb-pb-tablet": `${tablet.paddingBottom ?? section.style.paddingBottom ?? 64}px`,
    "--sb-min-tablet": `${tablet.minHeight ?? section.style.minHeight ?? 0}px`,
    "--sb-max-tablet": `${tablet.maxWidth ?? section.style.maxWidth ?? 1200}px`,
    "--sb-align-tablet": tablet.align||section.style.align||"left",
    "--sb-pt-mobile": `${mobile.paddingTop ?? 40}px`,
    "--sb-pb-mobile": `${mobile.paddingBottom ?? 40}px`,
    "--sb-min-mobile": `${mobile.minHeight ?? 0}px`,
    "--sb-max-mobile": `${mobile.maxWidth ?? 720}px`,
    "--sb-align-mobile": mobile.align||section.style.align||"left",
    "--sb-overlay": section.style.overlayColor||"#020812",
    "--sb-overlay-opacity": String(section.style.overlayOpacity??.45),
    "--sb-bg-position": section.style.backgroundPosition||"center",
    ...sizeVars(desktopScale,""),
    ...sizeVars(tabletScale,"-tablet"),
    ...sizeVars(mobileScale,"-mobile"),
    textAlign: section.style.align || "left",
    backgroundAttachment: section.style.backgroundFixed ? "fixed" : "scroll",
  } as CSSProperties;
}

function BackgroundLayer({section}:{section:BuilderSection}) {
  const mode=section.style.backgroundMode||"color";
  if(mode==="image"&&section.style.backgroundImage) return <><img className="sb-bg-media" src={section.style.backgroundImage} alt=""/><span className="sb-bg-overlay"/></>;
  if(mode==="video"&&section.style.backgroundVideo) return <><video className="sb-bg-media" src={section.style.backgroundVideo} autoPlay muted loop playsInline/><span className="sb-bg-overlay"/></>;
  return null;
}

function LinkButton({ label, url }: { label?: string; url?: string }) {
  if (!label || !url) return null;
  return <a className="sb-button" href={url}>{label}<span>→</span></a>;
}

function timelineLabel(value?: string) {
  const [tag = "", ...league] = (value || "").split(" · ");
  return { tag, league: league.join(" · ") };
}

function shellClass(section:BuilderSection,extra="") { return `sb-section ${extra} ${classVariant(section)} ${modeClass(section)}`.trim(); }

export function BuilderSectionView({ section }: { section: BuilderSection }) {
  if (!section.visible) return null;
  const vars = sectionVars(section);

  if (section.type === "spacer") return <div className={`sb-spacer ${classVariant(section)}`} style={{ height: section.style.minHeight || 60, background: section.style.background }} />;

  if (section.type === "hero") return <section className={shellClass(section,"sb-hero")} style={vars}>
    <BackgroundLayer section={section}/>{section.image && <img className="sb-hero-image" src={section.image} alt="" />}<div className="sb-hero-shade" />
    <div className="sb-inner sb-hero-copy"><span className="sb-kicker">{section.eyebrow}</span><h1>{section.title}{section.accent && <><br/><i>{section.accent}</i></>}</h1>{section.text && <p>{section.text}</p>}<LinkButton label={section.buttonLabel} url={section.buttonUrl} /></div>
  </section>;

  if (section.type === "split") return <section className={shellClass(section,"sb-split-section")} style={vars}><BackgroundLayer section={section}/><div className="sb-inner sb-split"><div className="sb-split-media">{section.image && <img src={section.image} alt="" />}</div><div className="sb-split-copy"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title} {section.accent && <i>{section.accent}</i>}</h2><p>{section.text}</p><LinkButton label={section.buttonLabel} url={section.buttonUrl}/></div></div></section>;

  if (section.type === "stats") return <section className={shellClass(section,"sb-stats-section")} style={vars}><BackgroundLayer section={section}/><div className="sb-inner"><div className="sb-section-head"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title}</h2></div><div className="sb-stats">{section.items.map((item)=><article key={item.id}><b>{item.value}</b><strong>{item.title}</strong>{item.text&&<span>{item.text}</span>}</article>)}</div></div></section>;

  if (section.type === "cards") return <section className={shellClass(section,"sb-cards-section")} style={vars}><BackgroundLayer section={section}/><div className="sb-inner"><div className="sb-section-head"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.text}</p></div><div className="sb-cards">{section.items.map((item)=><article key={item.id}>{item.image&&<img src={item.image} alt=""/>}{item.icon&&<img className="sb-card-icon" src={item.icon} alt=""/>}<div>{(item.eyebrow||item.subtitle)&&<small>{item.eyebrow||item.subtitle}</small>}<h3>{item.title}</h3><p>{item.text}</p>{item.linkLabel&&item.linkUrl&&<a href={item.linkUrl}>{item.linkLabel} →</a>}</div></article>)}</div></div></section>;

  if (section.type === "gallery") return <section className={shellClass(section,"sb-gallery-section")} style={vars}><BackgroundLayer section={section}/><div className="sb-inner"><div className="sb-section-head"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title}</h2></div><div className="sb-gallery">{section.items.map((item)=><figure key={item.id}><img src={item.image||"/team-entry-4k.webp"} alt={item.title||""}/>{(item.title||item.text)&&<figcaption><b>{item.title}</b><span>{item.text}</span></figcaption>}</figure>)}</div></div></section>;

  if (section.type === "timeline") return <section className={shellClass(section,"sb-timeline-section")} style={vars}><BackgroundLayer section={section}/><div className="sb-inner"><div className="sb-section-head"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title}</h2></div><div className="sb-timeline"><div className="sb-drive-line"/><div className="sb-drive-arrow"/>{section.items.map((item,index)=>{const label=timelineLabel(item.subtitle);return <article className={index===section.items.length-1?"next":""} key={item.id}><strong>{item.title}</strong><span className="sb-ball"><img src={footballIcon} alt=""/></span>{label.tag&&<small>{label.tag}</small>}{label.league&&<h3>{label.league}</h3>}{item.value&&<div className="sb-points"><span>POINTS</span><b>{item.value}</b></div>}{item.icon&&<img className="sb-timeline-icon" src={item.icon} alt=""/>}<p>{item.text}</p></article>})}</div></div></section>;

  if (section.type === "cta") return <section className={shellClass(section,"sb-cta")} style={vars}><BackgroundLayer section={section}/>{section.image&&<><img className="sb-cta-image" src={section.image} alt=""/><div className="sb-cta-shade"/></>}<div className="sb-inner"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title} {section.accent&&<i>{section.accent}</i>}</h2><p>{section.text}</p><LinkButton label={section.buttonLabel} url={section.buttonUrl}/></div></section>;

  if (section.type === "games") return <section id="spielplan" className={`section fixtures-section sb-native-section ${classVariant(section)} ${modeClass(section)}`} style={vars}><BackgroundLayer section={section}/><div className="section-heading"><div><span className="eyebrow red-text">{section.eyebrow||"SAISON"}</span><h2>{section.title||"NÄCHSTE GAMES."}</h2></div><p>{section.text}</p></div><div className="fixture-list" /></section>;

  if (section.type === "news") return <section className={`section news-preview sb-native-section ${classVariant(section)} ${modeClass(section)}`} style={vars}><BackgroundLayer section={section}/><div className="section-heading"><div><span className="eyebrow red-text">{section.eyebrow||"INSIDE RASCALS"}</span><h2>{section.title||"FROM THE HUDDLE."}</h2></div></div><div className="news-grid" /></section>;

  if (section.type === "sponsors") return <section className={`sponsor-strip sb-native-section ${classVariant(section)} ${modeClass(section)}`} style={vars}><BackgroundLayer section={section}/><p>{section.title||"PROUDLY POWERED BY"}</p><div className="ticker-window"><div className="ticker-track" /></div></section>;

  return <section className={shellClass(section,"sb-text-section")} style={vars}><BackgroundLayer section={section}/><div className="sb-inner sb-text"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title} {section.accent&&<i>{section.accent}</i>}</h2>{section.text&&<p>{section.text}</p>}<LinkButton label={section.buttonLabel} url={section.buttonUrl}/></div></section>;
}

function BuilderHeader({ state, current }: { state: SiteBuilderState; current: BuilderPage }) {
  const [open,setOpen]=useState(false);
  const pages=state.pages.filter((page)=>page.showInNav&&(page.enabled||legacySlugs.has(page.slug)));
  return <header className="sb-header" style={{background:state.theme.headerBackground,color:state.theme.headerText}}><a className="sb-brand" href="/"><img src={state.theme.logoUrl||"/rascals-logo-transparent-4k.png"} alt=""/><span><b>{state.theme.brandTop||"HELLENSTEIN"}</b><em>{state.theme.brandBottom||"RASCALS"}</em></span></a><button className="sb-menu" onClick={()=>setOpen(!open)} aria-label="Menü">☰</button><nav className={open?"open":""}>{pages.map((page)=><a key={page.id} className={page.id===current.id?"active":""} href={page.slug?`/${page.slug}`:"/"}>{page.navLabel}</a>)}{state.theme.navCtaLabel&&state.theme.navCtaUrl&&<a className="sb-nav-cta" href={state.theme.navCtaUrl}>{state.theme.navCtaLabel}</a>}</nav></header>;
}

export function SiteBuilderPage({ state, page }: { state: SiteBuilderState; page: BuilderPage }) {
  const hasGames=page.sections.some((section)=>section.visible&&section.type==="games");
  const hasFeeds=page.sections.some((section)=>section.visible&&(section.type==="news"||section.type==="sponsors"));
  const siteVars={
    "--site-bg":state.theme.background,"--site-text":state.theme.text,"--site-accent":state.theme.accent,"--site-surface":state.theme.surface,"--site-muted":state.theme.muted,
    "--site-max":`${state.theme.contentWidth}px`,"--site-radius":`${state.theme.radius}px`,"--site-heading-font":state.theme.headingFont,"--site-body-font":state.theme.bodyFont,
    "--site-heading-weight":String(state.theme.headingWeight),"--site-heading-tracking":`${state.theme.headingTracking}em`,"--site-body-line":String(state.theme.bodyLineHeight),"--site-heading-transform":state.theme.headingTransform,
  } as CSSProperties;
  return <div className="sb-site" style={siteVars}><BuilderHeader state={state} current={page}/><main>{page.sections.map((section)=><BuilderSectionView key={section.id} section={section}/>)}</main>{hasGames&&<DynamicHomeGames/>}{hasFeeds&&<DynamicHomeFeeds/>}<footer className="sb-footer"><span>{state.theme.footerTitle||"HELLENSTEIN RASCALS"}</span><small>{state.theme.footerSubtitle||"American Football · Heidenheim"}</small></footer></div>;
}
