"use client";

import type { ReactNode } from "react";
import "./admin-shell.css";

type AdminSection =
  | "dashboard" | "hero" | "news" | "media" | "sponsors" | "settings" | "users" | "trash"
  | "playeranalysis" | "teammanagement" | "gameoperations" | "trainingops" | "tracking" | "athletic" | "playbook"
  | "players" | "newplayer" | "roster" | "depthchart" | "gamedayroster" | "rosterhealth" | "coaches"
  | "performance" | "stats" | "development" | "teamdev" | "positiondev" | "lblab" | "lbanalytics"
  | "games" | "gameday";

type AdminShellProps = { active: AdminSection; title: string; eyebrow?: string; actions?: ReactNode; children: ReactNode };
type NavItemType = { key: AdminSection; label: string; href: string; icon: string; matches?: AdminSection[] };
type NavGroup = { label: string; items: NavItemType[] };
type TopModule = { label:string; href:string; sections:AdminSection[]; actions:Array<{label:string;href:string}> };

const navGroups: NavGroup[] = [
  { label: "HOME", items: [
    { key: "dashboard", label: "Home", href: "/admin/dashboard", icon: "⌂" },
  ]},
  { label: "TEAM", items: [
    { key: "players", label: "Spieler", href: "/admin/players", icon: "●" },
    { key: "newplayer", label: "+ Spieler anlegen", href: "/admin/players?new=1", icon: "+" },
    { key: "teammanagement", label: "Kader", href: "/admin/team-management?tab=roster", icon: "R", matches: ["teammanagement", "roster"] },
    { key: "depthchart", label: "Depth Chart", href: "/admin/depth-chart", icon: "≡" },
    { key: "coaches", label: "Coaches", href: "/admin/coaches", icon: "C" },
  ]},
  { label: "ATHLETIC", items: [
    { key: "athletic", label: "Athletic Übersicht", href: "/admin/athletic", icon: "A", matches: ["athletic", "tracking", "trainingops", "development", "teamdev", "positiondev", "rosterhealth"] },
    { key: "tracking", label: "Tracking", href: "/admin/athletic/tracking", icon: "＋" },
    { key: "trainingops", label: "Training", href: "/admin/training-operations", icon: "△" },
    { key: "development", label: "Development", href: "/admin/development", icon: "↗", matches: ["development", "teamdev", "positiondev"] },
    { key: "rosterhealth", label: "Availability", href: "/admin/roster-health", icon: "✓" },
  ]},
  { label: "ANALYSIS", items: [
    { key: "playeranalysis", label: "Player 360", href: "/admin/player-analysis", icon: "◎", matches: ["playeranalysis", "lblab", "lbanalytics"] },
    { key: "performance", label: "Performance", href: "/admin/performance", icon: "⌁" },
    { key: "stats", label: "Stats", href: "/admin/stats", icon: "▥" },
  ]},
  { label: "FOOTBALL", items: [
    { key: "playbook", label: "Playbook & Lineup", href: "/admin/playbook", icon: "▤" },
  ]},
  { label: "GAME DAY", items: [
    { key: "gameoperations", label: "Game Center", href: "/admin/game-operations", icon: "⚡", matches: ["gameoperations", "games", "gamedayroster", "gameday"] },
  ]},
  { label: "WEBSITE", items: [
    { key: "hero", label: "Startseite", href: "/admin/hero", icon: "▣" },
    { key: "news", label: "News", href: "/admin/news", icon: "◆" },
    { key: "media", label: "Medien", href: "/admin/media", icon: "◫" },
    { key: "sponsors", label: "Sponsoren", href: "/admin/sponsors", icon: "◇" },
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
  { label: "TEAM", href: "/admin/players", sections: ["players","newplayer","teammanagement","roster","depthchart","coaches"], actions: [
    {label:"Spieler",href:"/admin/players"},{label:"+ Spieler anlegen",href:"/admin/players?new=1"},{label:"Kader",href:"/admin/team-management?tab=roster"},{label:"Depth Chart",href:"/admin/depth-chart"},{label:"Coaches",href:"/admin/coaches"},
  ]},
  { label: "ATHLETIC", href: "/admin/athletic", sections: ["athletic","tracking","trainingops","development","teamdev","positiondev","rosterhealth"], actions: [
    {label:"Übersicht",href:"/admin/athletic"},{label:"Tracking",href:"/admin/athletic/tracking"},{label:"Training",href:"/admin/training-operations"},{label:"Development",href:"/admin/development"},{label:"Availability",href:"/admin/roster-health"},
  ]},
  { label: "ANALYSIS", href: "/admin/player-analysis", sections: ["playeranalysis","performance","stats","lblab","lbanalytics"], actions: [
    {label:"Player 360",href:"/admin/player-analysis"},{label:"Performance",href:"/admin/performance"},{label:"Stats",href:"/admin/stats"},{label:"Team Analyse",href:"/admin/development/team"},{label:"Position Groups",href:"/admin/development/positions"},
  ]},
  { label: "FOOTBALL", href: "/admin/playbook", sections: ["playbook"], actions: [
    {label:"Playbook",href:"/admin/playbook"},{label:"Formationen",href:"/admin/playbook/formations"},{label:"Aufstellung",href:"/admin/team-management?tab=depth"},{label:"Depth Chart",href:"/admin/depth-chart"},
  ]},
  { label: "GAME DAY", href: "/admin/game-operations", sections: ["gameoperations","games","gamedayroster","gameday"], actions: [
    {label:"Game Center",href:"/admin/game-operations"},{label:"Spielplan",href:"/admin/games"},{label:"Gameday Roster",href:"/admin/gameday-roster"},{label:"Live Command",href:"/admin/gameday"},{label:"Postgame",href:"/admin/game-operations?tab=postgame"},
  ]},
];

function isNavActive(item: NavItemType, active: AdminSection) {
  return item.key === active || Boolean(item.matches?.includes(active));
}

export function AdminShell({ active, title, eyebrow = "RASCALS OS", actions, children }: AdminShellProps) {
  const currentModule = topModules.find(module => module.sections.includes(active)) ?? topModules[0];
  return (
    <div className="cms-shell">
      <aside className="cms-sidebar">
        <a className="cms-brand" href="/admin/dashboard">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span><b>RASCALS</b><small>OPERATIONS SYSTEM</small></span>
        </a>
        <nav>
          {navGroups.map(group => (
            <div className="cms-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(item => <NavItem key={`${group.label}-${item.key}`} item={item} active={isNavActive(item, active)} />)}
            </div>
          ))}
        </nav>
        <div className="cms-user"><span>CG</span><div><b>CMS Zugriff</b><small>Cloudflare Access + Rollen</small></div></div>
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
