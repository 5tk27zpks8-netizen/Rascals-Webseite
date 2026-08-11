"use client";

import type { ReactNode } from "react";
import "./admin-shell.css";

type AdminSection =
  | "dashboard" | "hero" | "news" | "media" | "sponsors" | "settings" | "users" | "trash"
  | "players" | "newplayer" | "coaches"
  | "gameoperations" | "games" | "gamedayroster" | "gameday";

type AdminShellProps = { active: AdminSection; title: string; eyebrow?: string; actions?: ReactNode; children: ReactNode };
type NavItemType = { key: AdminSection; label: string; href: string; icon: string; matches?: AdminSection[] };
type NavGroup = { label: string; items: NavItemType[] };
type TopModule = { label:string; href:string; sections:AdminSection[]; actions:Array<{label:string;href:string}> };

const navGroups: NavGroup[] = [
  { label: "HOME", items: [
    { key: "dashboard", label: "Home", href: "/admin/dashboard", icon: "⌂" },
  ]},
  { label: "WEBSITE", items: [
    { key: "hero", label: "Startseite", href: "/admin/hero", icon: "▣" },
    { key: "news", label: "News", href: "/admin/news", icon: "◆" },
    { key: "media", label: "Medien", href: "/admin/media", icon: "◫" },
    { key: "sponsors", label: "Sponsoren", href: "/admin/sponsors", icon: "◇" },
  ]},
  { label: "TEAM", items: [
    { key: "players", label: "Spieler", href: "/admin/players", icon: "●" },
    { key: "newplayer", label: "+ Spieler anlegen", href: "/admin/players?new=1", icon: "+" },
    { key: "coaches", label: "Coaches", href: "/admin/coaches", icon: "C" },
  ]},
  { label: "GAME DAY", items: [
    { key: "gameoperations", label: "Game Center", href: "/admin/game-operations", icon: "⚡", matches: ["gameoperations", "games", "gamedayroster", "gameday"] },
    { key: "games", label: "Spielplan", href: "/admin/games", icon: "▦" },
    { key: "gamedayroster", label: "Gameday Roster", href: "/admin/gameday-roster", icon: "R" },
    { key: "gameday", label: "Live-Ticker", href: "/admin/gameday", icon: "●" },
  ]},
  { label: "SYSTEM", items: [
    { key: "users", label: "Benutzer", href: "/admin/users", icon: "●" },
    { key: "settings", label: "Einstellungen", href: "/admin/dashboard?section=settings", icon: "⚙" },
    { key: "trash", label: "Papierkorb", href: "/admin/trash", icon: "⌫" },
  ]},
];

const topModules: TopModule[] = [
  { label: "HOME", href: "/admin/dashboard", sections: ["dashboard"], actions: [
    {label:"Dashboard",href:"/admin/dashboard"},
  ]},
  { label: "WEBSITE", href: "/admin/hero", sections: ["hero","news","media","sponsors"], actions: [
    {label:"Startseite",href:"/admin/hero"},{label:"News",href:"/admin/news"},{label:"Medien",href:"/admin/media"},{label:"Sponsoren",href:"/admin/sponsors"},
  ]},
  { label: "TEAM", href: "/admin/players", sections: ["players","newplayer","coaches"], actions: [
    {label:"Spieler",href:"/admin/players"},{label:"+ Spieler anlegen",href:"/admin/players?new=1"},{label:"Coaches",href:"/admin/coaches"},
  ]},
  { label: "GAME DAY", href: "/admin/game-operations", sections: ["gameoperations","games","gamedayroster","gameday"], actions: [
    {label:"Game Center",href:"/admin/game-operations"},{label:"Spielplan",href:"/admin/games"},{label:"Gameday Roster",href:"/admin/gameday-roster"},{label:"Live-Ticker",href:"/admin/gameday"},{label:"Postgame",href:"/admin/game-operations?tab=postgame"},
  ]},
];

function isNavActive(item: NavItemType, active: AdminSection) {
  return item.key === active || Boolean(item.matches?.includes(active));
}

export function AdminShell({ active, title, eyebrow = "RASCALS WEBSITE", actions, children }: AdminShellProps) {
  const currentModule = topModules.find(module => module.sections.includes(active)) ?? topModules[0];
  return (
    <div className="cms-shell">
      <aside className="cms-sidebar">
        <a className="cms-brand" href="/admin/dashboard">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span><b>RASCALS</b><small>WEBSITE ADMIN</small></span>
        </a>
        <nav>
          {navGroups.map(group => (
            <div className="cms-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(item => <NavItem key={`${group.label}-${item.key}`} item={item} active={isNavActive(item, active)} />)}
            </div>
          ))}
        </nav>
        <div className="cms-user"><span>CG</span><div><b>CMS Zugriff</b><small>Website Verwaltung</small></div></div>
      </aside>
      <main className="cms-main">
        <header className="cms-topbar">
          <div><small>{eyebrow}</small><h1>{title}</h1></div>
          <div className="cms-top-actions"><a href="/" target="_blank">Website öffnen ↗</a>{actions}</div>
        </header>
        <nav className="cms-modulebar" aria-label="Hauptbereiche">
          {topModules.map(module => <a key={module.label} className={module.sections.includes(active)?"active":""} href={module.href}>{module.label}</a>)}
        </nav>
        <div className="cms-contextbar">
          <div className="cms-context-title"><small>{currentModule.label}</small><strong>Funktionen</strong></div>
          <div className="cms-context-actions">
            {currentModule.actions.map(item => <a key={item.href+item.label} href={item.href}>{item.label}</a>)}
          </div>
        </div>
        <div className="cms-content">{children}</div>
      </main>
    </div>
  );
}

function NavItem({ item, active }: { item: NavItemType; active: boolean }) {
  return <a className={active ? "active" : ""} href={item.href}><span>{item.icon}</span>{item.label}</a>;
}

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`cms-card ${className}`.trim()}>{children}</section>; }
export function AdminNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "error" }) { return <div className={`cms-notice ${tone}`}>{children}</div>; }
