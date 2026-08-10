"use client";

import type { ReactNode } from "react";
import "./admin-shell.css";

type AdminSection =
  | "dashboard" | "hero" | "news" | "media" | "sponsors" | "settings" | "users" | "trash"
  | "playeranalysis" | "teammanagement" | "gameoperations" | "trainingops" | "playbook"
  | "players" | "roster" | "depthchart" | "gamedayroster" | "rosterhealth" | "coaches"
  | "performance" | "stats" | "development" | "teamdev" | "positiondev" | "lblab" | "lbanalytics"
  | "games" | "gameday";

type AdminShellProps = {
  active: AdminSection;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

type NavItemType = { key: AdminSection; label: string; href: string; icon: string };

const overview: NavItemType[] = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: "⌂" },
];

const content: NavItemType[] = [
  { key: "hero", label: "Hero", href: "/admin/hero", icon: "▣" },
  { key: "news", label: "News", href: "/admin/news", icon: "◆" },
  { key: "media", label: "Medien", href: "/admin/media", icon: "◫" },
  { key: "sponsors", label: "Sponsoren", href: "/admin/sponsors", icon: "◇" },
];

const football: NavItemType[] = [
  { key: "teammanagement", label: "Team & Kader", href: "/admin/team-management", icon: "R" },
  { key: "players", label: "Spieler verwalten", href: "/admin/players", icon: "+" },
  { key: "playeranalysis", label: "Spieler & Analyse", href: "/admin/player-analysis", icon: "◎" },
  { key: "playbook", label: "Playbook & Scheme", href: "/admin/playbook", icon: "▤" },
  { key: "trainingops", label: "Training", href: "/admin/training-operations", icon: "△" },
  { key: "gameoperations", label: "Spielbetrieb", href: "/admin/game-operations", icon: "⚡" },
];

const system: NavItemType[] = [
  { key: "trash", label: "Papierkorb", href: "/admin/trash", icon: "⌫" },
  { key: "users", label: "Benutzer", href: "/admin/users", icon: "●" },
  { key: "settings", label: "Einstellungen", href: "/admin/dashboard?section=settings", icon: "⚙" },
];

const teamSections: AdminSection[] = ["teammanagement", "roster", "depthchart", "rosterhealth", "coaches"];
const analysisSections: AdminSection[] = ["playeranalysis", "performance", "stats", "development", "teamdev", "positiondev", "lblab", "lbanalytics"];
const gameSections: AdminSection[] = ["gameoperations", "games", "gamedayroster", "gameday"];

function isNavActive(item: NavItemType, active: AdminSection) {
  if (item.key === "teammanagement") return teamSections.includes(active);
  if (item.key === "playeranalysis") return analysisSections.includes(active);
  if (item.key === "gameoperations") return gameSections.includes(active);
  return item.key === active;
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
          <p>ÜBERSICHT</p>
          {overview.map(item => <NavItem key={item.key} item={item} active={isNavActive(item, active)} />)}
          <p>INHALTE</p>
          {content.map(item => <NavItem key={item.key} item={item} active={isNavActive(item, active)} />)}
          <p>FOOTBALL</p>
          {football.map(item => <NavItem key={item.key} item={item} active={isNavActive(item, active)} />)}
          <p>SYSTEM</p>
          {system.map(item => <NavItem key={item.key} item={item} active={isNavActive(item, active)} />)}
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

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`cms-card ${className}`.trim()}>{children}</section>;
}

export function AdminNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "error" }) {
  return <div className={`cms-notice ${tone}`}>{children}</div>;
}
