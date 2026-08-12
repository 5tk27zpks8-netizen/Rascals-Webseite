"use client";

import { useState, type CSSProperties } from "react";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { DynamicHomeGames } from "./DynamicHomeGames";
import type { BuilderPage, BuilderSection, SiteBuilderState } from "./lib/site-builder";
import "./site-builder.css";

const footballIcon = "https://api.iconify.design/ion/american-football.svg?color=%23ffffff";
const legacySlugs = new Set(["ueber-uns","team","sponsoring","shop","news","galerie"]);

function sectionVars(section: BuilderSection): CSSProperties {
  return {
    "--sb-bg": section.style.background || "#050d18",
    "--sb-text": section.style.textColor || "#fff",
    "--sb-accent": section.style.accentColor || "#e7192d",
    "--sb-pt": `${section.style.paddingTop ?? 64}px`,
    "--sb-pb": `${section.style.paddingBottom ?? 64}px`,
    "--sb-min": `${section.style.minHeight ?? 0}px`,
    "--sb-max": `${section.style.maxWidth ?? 1600}px`,
    "--sb-radius": `${section.style.rounded ?? 0}px`,
    "--sb-border": section.style.border || "transparent",
    textAlign: section.style.align || "left",
  } as CSSProperties;
}

function LinkButton({ label, url }: { label?: string; url?: string }) {
  if (!label || !url) return null;
  return <a className="sb-button" href={url}>{label}<span>→</span></a>;
}

function timelineLabel(value?: string) {
  const [tag = "", ...league] = (value || "").split(" · ");
  return { tag, league: league.join(" · ") };
}

export function BuilderSectionView({ section }: { section: BuilderSection }) {
  if (!section.visible) return null;
  const vars = sectionVars(section);

  if (section.type === "spacer") return <div className="sb-spacer" style={{ height: section.style.minHeight || 60, background: section.style.background }} />;

  if (section.type === "hero") return <section className="sb-section sb-hero" style={vars}>
    {section.image && <img className="sb-hero-image" src={section.image} alt="" />}
    <div className="sb-hero-shade" />
    <div className="sb-inner sb-hero-copy"><span className="sb-kicker">{section.eyebrow}</span><h1>{section.title}{section.accent && <><br/><i>{section.accent}</i></>}</h1>{section.text && <p>{section.text}</p>}<LinkButton label={section.buttonLabel} url={section.buttonUrl} /></div>
  </section>;

  if (section.type === "split") return <section className="sb-section" style={vars}><div className="sb-inner sb-split"><div className="sb-split-media">{section.image && <img src={section.image} alt="" />}</div><div className="sb-split-copy"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title} {section.accent && <i>{section.accent}</i>}</h2><p>{section.text}</p><LinkButton label={section.buttonLabel} url={section.buttonUrl}/></div></div></section>;

  if (section.type === "stats") return <section className="sb-section" style={vars}><div className="sb-inner"><div className="sb-section-head"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title}</h2></div><div className="sb-stats">{section.items.map((item)=><article key={item.id}><b>{item.value}</b><strong>{item.title}</strong>{item.text&&<span>{item.text}</span>}</article>)}</div></div></section>;

  if (section.type === "cards") return <section className="sb-section" style={vars}><div className="sb-inner"><div className="sb-section-head"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.text}</p></div><div className="sb-cards">{section.items.map((item)=><article key={item.id}>{item.image&&<img src={item.image} alt=""/>}{item.icon&&<img className="sb-card-icon" src={item.icon} alt=""/>}<div>{(item.eyebrow||item.subtitle)&&<small>{item.eyebrow||item.subtitle}</small>}<h3>{item.title}</h3><p>{item.text}</p>{item.linkLabel&&item.linkUrl&&<a href={item.linkUrl}>{item.linkLabel} →</a>}</div></article>)}</div></div></section>;

  if (section.type === "gallery") return <section className="sb-section" style={vars}><div className="sb-inner"><div className="sb-section-head"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title}</h2></div><div className="sb-gallery">{section.items.map((item)=><figure key={item.id}><img src={item.image||"/team-entry-4k.webp"} alt={item.title||""}/>{(item.title||item.text)&&<figcaption><b>{item.title}</b><span>{item.text}</span></figcaption>}</figure>)}</div></div></section>;

  if (section.type === "timeline") return <section className="sb-section sb-timeline-section" style={vars}><div className="sb-inner"><div className="sb-section-head"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title}</h2></div><div className="sb-timeline"><div className="sb-drive-line"/><div className="sb-drive-arrow"/>{section.items.map((item,index)=>{const label=timelineLabel(item.subtitle);return <article className={index===section.items.length-1?"next":""} key={item.id}><strong>{item.title}</strong><span className="sb-ball"><img src={footballIcon} alt=""/></span>{label.tag&&<small>{label.tag}</small>}{label.league&&<h3>{label.league}</h3>}{item.value&&<div className="sb-points"><span>POINTS</span><b>{item.value}</b></div>}{item.icon&&<img className="sb-timeline-icon" src={item.icon} alt=""/>}<p>{item.text}</p></article>})}</div></div></section>;

  if (section.type === "cta") return <section className="sb-section sb-cta" style={vars}>{section.image&&<><img className="sb-cta-image" src={section.image} alt=""/><div className="sb-cta-shade"/></>}<div className="sb-inner"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title} {section.accent&&<i>{section.accent}</i>}</h2><p>{section.text}</p><LinkButton label={section.buttonLabel} url={section.buttonUrl}/></div></section>;

  if (section.type === "games") return <section id="spielplan" className="section fixtures-section sb-native-section" style={vars}><div className="section-heading"><div><span className="eyebrow red-text">{section.eyebrow||"SAISON"}</span><h2>{section.title||"NÄCHSTE GAMES."}</h2></div><p>{section.text}</p></div><div className="fixture-list" /></section>;

  if (section.type === "news") return <section className="section news-preview sb-native-section" style={vars}><div className="section-heading"><div><span className="eyebrow red-text">{section.eyebrow||"INSIDE RASCALS"}</span><h2>{section.title||"FROM THE HUDDLE."}</h2></div></div><div className="news-grid" /></section>;

  if (section.type === "sponsors") return <section className="sponsor-strip sb-native-section" style={vars}><p>{section.title||"PROUDLY POWERED BY"}</p><div className="ticker-window"><div className="ticker-track" /></div></section>;

  return <section className="sb-section" style={vars}><div className="sb-inner sb-text"><span className="sb-kicker">{section.eyebrow}</span><h2>{section.title} {section.accent&&<i>{section.accent}</i>}</h2>{section.text&&<p>{section.text}</p>}<LinkButton label={section.buttonLabel} url={section.buttonUrl}/></div></section>;
}

function BuilderHeader({ state, current }: { state: SiteBuilderState; current: BuilderPage }) {
  const [open,setOpen]=useState(false);
  const pages=state.pages.filter((page)=>page.showInNav&&(page.enabled||legacySlugs.has(page.slug)));
  return <header className="sb-header" style={{background:state.theme.headerBackground,color:state.theme.headerText}}><a className="sb-brand" href="/"><img src="/rascals-logo-transparent-4k.png" alt=""/><span><b>HELLENSTEIN</b><em>RASCALS</em></span></a><button className="sb-menu" onClick={()=>setOpen(!open)} aria-label="Menü">☰</button><nav className={open?"open":""}>{pages.map((page)=><a key={page.id} className={page.id===current.id?"active":""} href={page.slug?`/${page.slug}`:"/"}>{page.navLabel}</a>)}<a className="sb-nav-cta" href="mailto:football@hsb1846.de">Mitmachen</a></nav></header>;
}

export function SiteBuilderPage({ state, page }: { state: SiteBuilderState; page: BuilderPage }) {
  const hasGames=page.sections.some((section)=>section.visible&&section.type==="games");
  const hasFeeds=page.sections.some((section)=>section.visible&&(section.type==="news"||section.type==="sponsors"));
  const siteVars={"--site-bg":state.theme.background,"--site-text":state.theme.text,"--site-accent":state.theme.accent,"--site-surface":state.theme.surface,"--site-muted":state.theme.muted,"--site-max":`${state.theme.contentWidth}px`,"--site-radius":`${state.theme.radius}px`} as CSSProperties;
  return <div className="sb-site" style={siteVars}><BuilderHeader state={state} current={page}/><main>{page.sections.map((section)=><BuilderSectionView key={section.id} section={section}/>)}</main>{hasGames&&<DynamicHomeGames/>}{hasFeeds&&<DynamicHomeFeeds/>}<footer className="sb-footer"><span>HELLENSTEIN RASCALS</span><small>American Football · Heidenheim</small></footer></div>;
}
