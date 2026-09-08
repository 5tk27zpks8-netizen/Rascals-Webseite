"use client";

import type { ReactNode } from "react";
import type { CmsPermission, CmsRole } from "../../lib/permissions";
import { useAdminAccess } from "./AdminAccess";
import "./admin-shell.css";

type AdminShellProps={active:string;title:string;eyebrow?:string;actions?:ReactNode;children:ReactNode};
type NavItem={key:string;label:string;href:string;icon:string;matches?:string[]};
type NavGroup={label:string;items:NavItem[]};
type TopModule={label:string;href:string;sections:string[];actions:Array<{key:string;label:string;href:string}>};

const navGroups:NavGroup[]=[
  {label:"HOME",items:[{key:"dashboard",label:"Home",href:"/admin/dashboard",icon:"⌂"}]},
  {label:"WEBSITE",items:[
    {key:"website",label:"Website gestalten",href:"/admin/website",icon:"▦",matches:["hero","sections"]},
    {key:"preview",label:"Entwurf-Vorschau",href:"/admin/website/preview",icon:"◉"},
    {key:"designs",label:"Designs",href:"/admin/designs",icon:"◈"},
    {key:"news",label:"News",href:"/admin/news",icon:"◆"},
    {key:"media",label:"Medien",href:"/admin/media",icon:"◫"},
    {key:"sponsors",label:"Sponsoren",href:"/admin/sponsors",icon:"◇"},
  ]},
  {label:"TEAM",items:[{key:"players",label:"Spieler",href:"/admin/players",icon:"●"},{key:"newplayer",label:"+ Spieler anlegen",href:"/admin/players?new=1",icon:"+"},{key:"coaches",label:"Coaches",href:"/admin/coaches",icon:"C"}]},
  {label:"GAME DAY",items:[{key:"gameoperations",label:"Game Center",href:"/admin/game-operations",icon:"⚡",matches:["gameoperations","games","gamedayroster","gameday"]},{key:"games",label:"Spielplan",href:"/admin/games",icon:"▦"},{key:"gamedayroster",label:"Gameday Roster",href:"/admin/gameday-roster",icon:"R"},{key:"gameday",label:"Live-Ticker",href:"/admin/gameday",icon:"●"}]},
  {label:"SYSTEM",items:[{key:"users",label:"Benutzer",href:"/admin/users",icon:"●"},{key:"settings",label:"Einstellungen",href:"/admin/dashboard?section=settings",icon:"⚙"},{key:"trash",label:"Papierkorb",href:"/admin/trash",icon:"⌫"}]},
];

const topModules:TopModule[]=[
  {label:"HOME",href:"/admin/dashboard",sections:["dashboard"],actions:[{key:"dashboard",label:"Dashboard",href:"/admin/dashboard"}]},
  {label:"WEBSITE",href:"/admin/website",sections:["website","preview","designs","hero","sections","news","media","sponsors"],actions:[{key:"website",label:"Website gestalten",href:"/admin/website"},{key:"preview",label:"Entwurf-Vorschau",href:"/admin/website/preview"},{key:"designs",label:"Designs",href:"/admin/designs"},{key:"news",label:"News",href:"/admin/news"},{key:"media",label:"Medien",href:"/admin/media"},{key:"sponsors",label:"Sponsoren",href:"/admin/sponsors"}]},
  {label:"TEAM",href:"/admin/players",sections:["players","newplayer","coaches"],actions:[{key:"players",label:"Spieler",href:"/admin/players"},{key:"newplayer",label:"+ Spieler anlegen",href:"/admin/players?new=1"},{key:"coaches",label:"Coaches",href:"/admin/coaches"}]},
  {label:"GAME DAY",href:"/admin/game-operations",sections:["gameoperations","games","gamedayroster","gameday"],actions:[{key:"gameoperations",label:"Game Center",href:"/admin/game-operations"},{key:"games",label:"Spielplan",href:"/admin/games"},{key:"gamedayroster",label:"Gameday Roster",href:"/admin/gameday-roster"},{key:"gameday",label:"Live-Ticker",href:"/admin/gameday"},{key:"gameoperations",label:"Postgame",href:"/admin/game-operations?tab=postgame"}]},
];

/**
 * Which permission each nav entry needs. Hiding an entry is a convenience, not
 * the guard: every route behind them re-checks the same permission server-side.
 */
const permissionForKey:Record<string,CmsPermission|null>={
  dashboard:null,
  website:"website_edit",preview:"website_edit",designs:"design_manage",news:"news",media:"media",sponsors:"sponsors",
  players:"players",newplayer:"players",coaches:"coaches",
  gameoperations:"games",games:"games_view",gamedayroster:"roster",gameday:"gameday_view",
  users:"users",settings:"settings",trash:"trash",
};

/**
 * Areas the standard view may read but not change. Lacking the write
 * permission turns the page into a read-only view with a note saying so, so
 * players are not left clicking buttons that the server will reject anyway.
 */
const writePermissionForKey:Record<string,CmsPermission|undefined>={games:"games",gameday:"gameday"};

const roleLabel:Record<CmsRole,string>={
  admin:"Voller Zugriff",editor:"Website & Inhalte",photographer:"Medien",
  coach:"Team & Game Day",gameday:"Game Day",viewer:"Standardansicht",
};

function initials(name:string){
  const parts=name.trim().split(/[\s@._-]+/).filter(Boolean);
  return (parts.slice(0,2).map(p=>p[0]).join("")||"R").toUpperCase();
}

export function AdminShell({active,title,eyebrow="RASCALS WEBSITE",actions,children}:AdminShellProps){
  const access=useAdminAccess();
  // No provider means no information, not "no rights" — the server decides.
  // Standard-view accounts get no dashboard: it is built from data they may
  // not read, and /admin/dashboard bounces them back to the Spielplan anyway.
  const standardOnly=Boolean(access&&access.permissions.length>0&&access.permissions.every(p=>p==="games_view"||p==="gameday_view"));
  const allow=(key:string)=>{if(key==="dashboard")return !standardOnly;const needed=permissionForKey[key];return !needed||!access||access.permissions.includes(needed)};
  const groups=navGroups.map(g=>({...g,items:g.items.filter(i=>allow(i.key))})).filter(g=>g.items.length>0);
  const modules=topModules.map(m=>({...m,actions:m.actions.filter(a=>allow(a.key))})).filter(m=>m.actions.length>0);
  const currentModule=modules.find(m=>m.sections.includes(active))??modules[0]??topModules[0];
  const focused=active==="website"||active==="designs";
  const writeNeeded=writePermissionForKey[active];
  const readOnly=Boolean(writeNeeded&&access&&!access.permissions.includes(writeNeeded));
  return <div className="cms-shell"><aside className="cms-sidebar"><a className="cms-brand" href={groups[0]?.items[0]?.href??"/admin/dashboard"}><img src="/rascals-logo-transparent-4k.png" alt=""/><span><b>RASCALS</b><small>WEBSITE ADMIN</small></span></a><nav>{groups.map(g=><div className="cms-nav-group" key={g.label}><p>{g.label}</p>{g.items.map(i=><a key={i.href+i.label} className={i.key===active||i.matches?.includes(active)?"active":""} href={i.href}><span>{i.icon}</span>{i.label}</a>)}</div>)}</nav><div className="cms-user"><span>{initials(access?.name??"Rascals")}</span><div><b>{access?.name??"CMS Zugriff"}</b><small>{access?roleLabel[access.role]:"Website Verwaltung"}</small></div><a className="cms-logout" href="/logout">Abmelden</a></div></aside><main className={`cms-main ${focused?"cms-main-focused":""}`}><header className="cms-topbar"><div><small>{eyebrow}</small><h1>{title}</h1></div><div className="cms-top-actions"><a href="/" target="_blank">Website öffnen ↗</a>{!readOnly&&actions}</div></header>{!focused&&<><nav className="cms-modulebar">{modules.map(m=><a key={m.label} className={m.sections.includes(active)?"active":""} href={m.actions.some(a=>a.href===m.href)?m.href:m.actions[0].href}>{m.label}</a>)}</nav><div className="cms-contextbar"><div className="cms-context-title"><small>{currentModule.label}</small><strong>Funktionen</strong></div><div className="cms-context-actions">{currentModule.actions.map(i=><a key={i.href+i.label} href={i.href}>{i.label}</a>)}</div></div></>}<div className="cms-content">{readOnly&&<p className="cms-readonly-note">Nur-Lesen-Ansicht — du kannst hier alles verfolgen, aber nichts ändern. Mehr Rechte vergibt ein Admin unter Benutzer.</p>}<div className={readOnly?"cms-readonly":undefined}>{children}</div></div></main></div>
}

export function AdminCard({children,className=""}:{children:ReactNode;className?:string}){return <section className={`cms-card ${className}`.trim()}>{children}</section>}
export function AdminNotice({children,tone="info"}:{children:ReactNode;tone?:"info"|"success"|"error"}){return <div className={`cms-notice ${tone}`}>{children}</div>}
