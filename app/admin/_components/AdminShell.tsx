"use client";

import type { ReactNode } from "react";
import "./admin-shell.css";

type AdminShellProps={active:string;title:string;eyebrow?:string;actions?:ReactNode;children:ReactNode};
type NavItem={key:string;label:string;href:string;icon:string;matches?:string[]};
type NavGroup={label:string;items:NavItem[]};
type TopModule={label:string;href:string;sections:string[];actions:Array<{label:string;href:string}>};

const navGroups:NavGroup[]=[
  {label:"HOME",items:[{key:"dashboard",label:"Home",href:"/admin/dashboard",icon:"⌂"}]},
  {label:"WEBSITE",items:[
    {key:"website",label:"Website gestalten",href:"/admin/website",icon:"▦",matches:["hero","sections"]},
    {key:"news",label:"News",href:"/admin/news",icon:"◆"},
    {key:"media",label:"Medien",href:"/admin/media",icon:"◫"},
    {key:"sponsors",label:"Sponsoren",href:"/admin/sponsors",icon:"◇"},
  ]},
  {label:"TEAM",items:[{key:"players",label:"Spieler",href:"/admin/players",icon:"●"},{key:"newplayer",label:"+ Spieler anlegen",href:"/admin/players?new=1",icon:"+"},{key:"coaches",label:"Coaches",href:"/admin/coaches",icon:"C"}]},
  {label:"GAME DAY",items:[{key:"gameoperations",label:"Game Center",href:"/admin/game-operations",icon:"⚡",matches:["gameoperations","games","gamedayroster","gameday"]},{key:"games",label:"Spielplan",href:"/admin/games",icon:"▦"},{key:"gamedayroster",label:"Gameday Roster",href:"/admin/gameday-roster",icon:"R"},{key:"gameday",label:"Live-Ticker",href:"/admin/gameday",icon:"●"}]},
  {label:"SYSTEM",items:[{key:"users",label:"Benutzer",href:"/admin/users",icon:"●"},{key:"settings",label:"Einstellungen",href:"/admin/dashboard?section=settings",icon:"⚙"},{key:"trash",label:"Papierkorb",href:"/admin/trash",icon:"⌫"}]},
];

const topModules:TopModule[]=[
  {label:"HOME",href:"/admin/dashboard",sections:["dashboard"],actions:[{label:"Dashboard",href:"/admin/dashboard"}]},
  {label:"WEBSITE",href:"/admin/website",sections:["website","hero","sections","news","media","sponsors"],actions:[{label:"Website gestalten",href:"/admin/website"},{label:"News",href:"/admin/news"},{label:"Medien",href:"/admin/media"},{label:"Sponsoren",href:"/admin/sponsors"}]},
  {label:"TEAM",href:"/admin/players",sections:["players","newplayer","coaches"],actions:[{label:"Spieler",href:"/admin/players"},{label:"+ Spieler anlegen",href:"/admin/players?new=1"},{label:"Coaches",href:"/admin/coaches"}]},
  {label:"GAME DAY",href:"/admin/game-operations",sections:["gameoperations","games","gamedayroster","gameday"],actions:[{label:"Game Center",href:"/admin/game-operations"},{label:"Spielplan",href:"/admin/games"},{label:"Gameday Roster",href:"/admin/gameday-roster"},{label:"Live-Ticker",href:"/admin/gameday"},{label:"Postgame",href:"/admin/game-operations?tab=postgame"}]},
];

export function AdminShell({active,title,eyebrow="RASCALS WEBSITE",actions,children}:AdminShellProps){
  const currentModule=topModules.find(m=>m.sections.includes(active))??topModules[0];
  return <div className="cms-shell"><aside className="cms-sidebar"><a className="cms-brand" href="/admin/dashboard"><img src="/rascals-logo-transparent-4k.png" alt=""/><span><b>RASCALS</b><small>WEBSITE ADMIN</small></span></a><nav>{navGroups.map(g=><div className="cms-nav-group" key={g.label}><p>{g.label}</p>{g.items.map(i=><a key={i.href+i.label} className={i.key===active||i.matches?.includes(active)?"active":""} href={i.href}><span>{i.icon}</span>{i.label}</a>)}</div>)}</nav><div className="cms-user"><span>CG</span><div><b>CMS Zugriff</b><small>Website Verwaltung</small></div></div></aside><main className="cms-main"><header className="cms-topbar"><div><small>{eyebrow}</small><h1>{title}</h1></div><div className="cms-top-actions"><a href="/" target="_blank">Website öffnen ↗</a>{actions}</div></header><nav className="cms-modulebar">{topModules.map(m=><a key={m.label} className={m.sections.includes(active)?"active":""} href={m.href}>{m.label}</a>)}</nav><div className="cms-contextbar"><div className="cms-context-title"><small>{currentModule.label}</small><strong>Funktionen</strong></div><div className="cms-context-actions">{currentModule.actions.map(i=><a key={i.href+i.label} href={i.href}>{i.label}</a>)}</div></div><div className="cms-content">{children}</div></main></div>
}

export function AdminCard({children,className=""}:{children:ReactNode;className?:string}){return <section className={`cms-card ${className}`.trim()}>{children}</section>}
export function AdminNotice({children,tone="info"}:{children:ReactNode;tone?:"info"|"success"|"error"}){return <div className={`cms-notice ${tone}`}>{children}</div>}
