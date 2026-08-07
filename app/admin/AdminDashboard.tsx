"use client";

import { useEffect, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "./_components/AdminShell";
import "./dashboard.css";

type Game = {
  id: string;
  slug: string;
  opponent: string;
  opponentLogo: string;
  venue: string;
  homeAway: string;
  kickoff: string | null;
  status: string;
  rascalsScore: number;
  opponentScore: number;
  quarter: string;
  gameClock: string;
};

type DashboardData = {
  current: { email: string; name: string; role: string };
  metrics: {
    players: number;
    coaches: number;
    sponsors: number;
    publishedNews: number;
    games: number;
    wins: number;
    losses: number;
  };
  liveGame: Game | null;
  nextGame: Game | null;
  recentNews: Array<{ id: string; slug: string; title: string; status: string; date: string }>;
};

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/admin/api/dashboard");
      if (!response.ok) throw new Error("Dashboard konnte nicht geladen werden.");
      setData(await response.json() as DashboardData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }

  return <AdminShell active="dashboard" title="Dashboard" eyebrow="RASCALS CMS · PHASE 4">
    {notice && <AdminNotice tone="error">{notice}</AdminNotice>}
    {loading && <div className="dashboard-loading">Dashboard wird geladen…</div>}
    {!loading && data && <div className="dashboard-v2">
      <section className="dashboard-welcome">
        <div>
          <small>WELCOME BACK</small>
          <h2>{data.current.name || data.current.email}</h2>
          <p>{roleLabel(data.current.role)} · Rascals Content Control</p>
        </div>
        <div className="dashboard-record"><span>SAISON 2026</span><b>{data.metrics.wins}-{data.metrics.losses}</b><small>W / L</small></div>
      </section>

      <section className="dashboard-metrics">
        <Metric label="SPIELER" value={data.metrics.players} href="/admin/players" />
        <Metric label="COACHES" value={data.metrics.coaches} href="/admin/coaches" />
        <Metric label="SPIELE" value={data.metrics.games} href="/admin/games" />
        <Metric label="NEWS LIVE" value={data.metrics.publishedNews} href="/admin/news" />
        <Metric label="SPONSOREN" value={data.metrics.sponsors} href="/admin/sponsors" />
      </section>

      {data.liveGame ? <section className="dashboard-live-card">
        <div className="dashboard-live-head"><span>● LIVE</span><b>{data.liveGame.quarter || "GAME"}{data.liveGame.gameClock ? ` · ${data.liveGame.gameClock}` : ""}</b></div>
        <div className="dashboard-live-score">
          <div><img src="/rascals-logo-transparent-4k.png" alt=""/><span>RASCALS</span><strong>{data.liveGame.rascalsScore}</strong></div>
          <em>:</em>
          <div>{data.liveGame.opponentLogo ? <img src={data.liveGame.opponentLogo} alt=""/> : <i>?</i>}<span>{data.liveGame.opponent}</span><strong>{data.liveGame.opponentScore}</strong></div>
        </div>
        <div className="dashboard-live-actions"><a href={`/admin/gameday?game=${data.liveGame.id}`}>Gameday öffnen →</a><a href={`/spielplan/${data.liveGame.slug}`} target="_blank">Öffentliche Seite ↗</a></div>
      </section> : data.nextGame && <section className="dashboard-next-card">
        <div><small>NÄCHSTES SPIEL</small><h3>{data.nextGame.homeAway === "home" ? "RASCALS VS" : "RASCALS @"} {data.nextGame.opponent}</h3><p>{formatDate(data.nextGame.kickoff)} · {data.nextGame.venue || (data.nextGame.homeAway === "home" ? "Heimspiel" : "Auswärtsspiel")}</p></div>
        <div className="dashboard-next-logos"><img src="/rascals-logo-transparent-4k.png" alt=""/>{data.nextGame.opponentLogo ? <img src={data.nextGame.opponentLogo} alt=""/> : <i>?</i>}</div>
        <a href={`/admin/games`}>Spiel bearbeiten →</a>
      </section>}

      <section className="dashboard-columns">
        <AdminCard>
          <div className="cms-section-head"><div><small>SCHNELLAKTIONEN</small><h2>Direkt öffnen</h2></div></div>
          <div className="dashboard-quick-grid">
            <Quick href="/admin/players" icon="#" title="Spieler" text="Roster, Bilder, Rollen" />
            <Quick href="/admin/coaches" icon="C" title="Coaches" text="Staff verwalten" />
            <Quick href="/admin/games" icon="◎" title="Spielplan" text="Games & Ergebnisse" />
            <Quick href="/admin/gameday" icon="⚡" title="Gameday" text="Live-Ticker führen" />
            <Quick href="/admin/news" icon="◆" title="News" text="Beiträge veröffentlichen" />
            <Quick href="/admin/media" icon="◫" title="Medien" text="Bilder hochladen" />
          </div>
        </AdminCard>

        <AdminCard>
          <div className="cms-section-head"><div><small>LETZTE INHALTE</small><h2>News</h2></div><a className="dashboard-small-link" href="/admin/news">Alle →</a></div>
          <div className="dashboard-news-list">
            {data.recentNews.map((item) => <a key={item.id} href="/admin/news"><span><b>{item.title}</b><small>{statusLabel(item.status)} · {formatShortDate(item.date)}</small></span><em>→</em></a>)}
            {!data.recentNews.length && <p className="cms-muted">Noch keine News-Beiträge vorhanden.</p>}
          </div>
        </AdminCard>
      </section>
    </div>}
  </AdminShell>;
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return <a className="dashboard-metric" href={href}><small>{label}</small><strong>{value}</strong><span>Öffnen →</span></a>;
}

function Quick({ href, icon, title, text }: { href: string; icon: string; title: string; text: string }) {
  return <a className="dashboard-quick" href={href}><b>{icon}</b><span><strong>{title}</strong><small>{text}</small></span></a>;
}

function roleLabel(role: string) {
  return ({ admin: "Administrator", editor: "Redakteur", photographer: "Fotograf", coach: "Coach", gameday: "Gameday", viewer: "Nur Lesen" } as Record<string,string>)[role] || role;
}

function statusLabel(status: string) {
  return ({ draft: "ENTWURF", scheduled: "GEPLANT", published: "VERÖFFENTLICHT", archived: "ARCHIV" } as Record<string,string>)[status] || status.toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "Termin offen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatShortDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}
