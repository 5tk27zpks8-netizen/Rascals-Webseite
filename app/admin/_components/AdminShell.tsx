"use client";

import type { ReactNode } from "react";
import "./admin-shell.css";

type AdminSection =
  | "dashboard" | "hero" | "news" | "media" | "sponsors" | "settings" | "users" | "trash"
  | "playeranalysis" | "teammanagement" | "gameoperations" | "trainingops" | "playbook"
  | "players" | "roster" | "depthchart" | "gamedayroster" | "rosterhealth" | "coaches"
  | "performance" | "stats" | "development" | "teamdev" | "positiondev" | "lblab" | "lbanalytics"
  | "games" | "gameday";

type AdminShellProps = { active: AdminSection; title: string; eyebrow?: string; actions?: ReactNode; children: ReactNode };
type NavItemType = { key: AdminSection; label: string; href: string; icon: string; matches?: AdminSection[] };
type NavGroup = { label: string; items: NavItemType[] };

const navGroups: NavGroup[] = [
  { label: "HOME", items: [
    { key: "dashboard", label: "Home", href: "/admin/dashboard", icon: "⌂" },
  ]},
  { label: "TEAM", items: [
    { key: "players", label: "Spieler", href: "/admin/players", icon: "●" },
    { key: "teammanagement", label: "Kader", href: "/admin/team-management?tab=roster", icon: "R", matches: ["teammanagement", "roster", "rosterhealth"] },
    { key: "depthchart", label: "Depth Chart", href: "/admin/depth-chart", icon: "≡" },
    { key: "coaches", label: "Coaches", href: "/admin/coaches", icon: "C" },
  ]},
  { label: "ATHLETIC", items: [
    { key: "trainingops", label: "Training", href: "/admin/training-operations", icon: "△" },
    { key: "development", label: "Development", href: "/admin/development", icon: "↗", matches: ["development", "teamdev", "positiondev"] },
    { key: "rosterhealth", label: "Availability", href: "/admin/roster-health", icon: "+" },
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

function isNavActive(item: NavItemType, active: AdminSection) {
  return item.key === active || Boolean(item.matches?.includes(active));
}

export function AdminShell({ active, title, eyebrow = "RASCALS OS", actions, children }: AdminShellProps) {
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
