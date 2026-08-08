"use client";

import type { ReactNode } from "react";
import "./admin-shell.css";

type AdminSection = "dashboard" | "hero" | "news" | "media" | "sponsors" | "settings" | "users" | "players" | "roster" | "depthchart" | "coaches" | "performance" | "development" | "games" | "gameday" | "trash";

type AdminShellProps = {
  active: AdminSection;
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const nav = [
  { key: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: "⌂" },
  { key: "hero", label: "Hero", href: "/admin/hero", icon: "▣" },
  { key: "news", label: "News", href: "/admin/news", icon: "◆" },
  { key: "media", label: "Medien", href: "/admin/media", icon: "◫" },
  { key: "sponsors", label: "Sponsoren", href: "/admin/sponsors", icon: "◇" },
  { key: "players", label: "Spieler", href: "/admin/players", icon: "#" },
  { key: "roster", label: "Season Roster", href: "/admin/roster", icon: "R" },
  { key: "depthchart", label: "Depth Chart", href: "/admin/depth-chart", icon: "D" },
  { key: "coaches", label: "Coaches", href: "/admin/coaches", icon: "C" },
  { key: "performance", label: "Performance", href: "/admin/performance", icon: "↗" },
  { key: "development", label: "Entwicklung", href: "/admin/development", icon: "◎" },
  { key: "games", label: "Spielplan", href: "/admin/games", icon: "◉" },
  { key: "gameday", label: "Gameday", href: "/admin/gameday", icon: "⚡" },
  { key: "trash", label: "Papierkorb", href: "/admin/trash", icon: "⌫" },
  { key: "users", label: "Benutzer", href: "/admin/users", icon: "●" },
  { key: "settings", label: "Einstellungen", href: "/admin/dashboard?section=settings", icon: "⚙" },
] as const;

export function AdminShell({ active, title, eyebrow = "RASCALS CMS · PHASE 4", actions, children }: AdminShellProps) {
  return (
    <div className="cms-shell">
      <aside className="cms-sidebar">
        <a className="cms-brand" href="/admin/dashboard">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span><b>RASCALS</b><small>CONTENT CONTROL</small></span>
        </a>
        <nav>
          <p>ÜBERSICHT</p>
          <NavItem item={nav[0]} active={active === nav[0].key} />
          <p>INHALTE</p>
          {nav.slice(1, 5).map((item) => <NavItem key={item.key} item={item} active={active === item.key} />)}
          <p>FOOTBALL</p>
          {nav.slice(5, 13).map((item) => <NavItem key={item.key} item={item} active={active === item.key} />)}
          <p>SYSTEM</p>
          {nav.slice(13).map((item) => <NavItem key={item.key} item={item} active={active === item.key} />)}
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

function NavItem({ item, active }: { item: (typeof nav)[number]; active: boolean }) {
  return <a className={active ? "active" : ""} href={item.href}><span>{item.icon}</span>{item.label}</a>;
}

export function AdminCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`cms-card ${className}`.trim()}>{children}</section>;
}

export function AdminNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "error" }) {
  return <div className={`cms-notice ${tone}`}>{children}</div>;
}
