"use client";

import { useEffect, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "./_components/AdminShell";
import "./dashboard.css";

type Game = { id:string; slug:string; opponent:string; opponentLogo:string; venue:string; homeAway:string; kickoff:string|null; status:string; rascalsScore:number; opponentScore:number; quarter:string; gameClock:string };
type DashboardData = { current:{email:string;name:string;role:string}; metrics:{players:number;coaches:number;sponsors:number;publishedNews:number;games:number;wins:number;losses:number}; liveGame:Game|null; nextGame:Game|null; recentNews:Array<{id:string;slug:string;title:string;status:string;date:string}> };

export function AdminDashboard(){
  const[data,setData]=useState<DashboardData|null>(null); const[notice,setNotice]=useState(""); const[loading,setLoading]=useState(true);
  useEffect(()=>{void load()},[]);
  async function load(){setLoading(true);setNotice("");try{const r=await fetch("/admin/api/dashboard");if(!r.ok)throw new Error("Dashboard konnte nicht geladen werden.");setData(await r.json() as DashboardData)}catch(e){setNotice(e instanceof Error?e.message:"Fehler beim Laden.")}finally{setLoading(false)}}
  return <AdminShell active="dashboard" title="Home" eyebrow="RASCALS OS · COMMAND CENTER" actions={<a className="cms-button" href="/admin/players?new=1">＋ Spieler anlegen</a>}>
    {notice&&<AdminNotice tone="error">{notice}</AdminNotice>}{loading&&<div className="dashboard-loading">Dashboard wird geladen…</div>}
    {!loading&&data&&<div className="dashboard-v2">
      <section className="dashboard-welcome"><div><small>COMMAND CENTER</small><h2>{data.current.name||data.current.email}</h2><p>Wähle deine Aufgabe. Die Fachbereiche darunter führen dich direkt zum richtigen Workflow.</p></div><div className="dashboard-record"><span>SAISON</span><b>{data.metrics.wins}-{data.metrics.losses}</b><small>W / L</small></div></section>

      <section className="dashboard-columns">
        <AdminCard><div className="cms-section-head"><div><small>TEAM</small><h2>Spieler & Kader</h2></div></div><div className="dashboard-quick-grid">
          <Quick href="/admin/players" icon="●" title="Spieler" text="Profile suchen, öffnen und Stammdaten bearbeiten" />
          <Quick href="/admin/players?new=1" icon="＋" title="Spieler anlegen" text="Neues Spielerprofil in wenigen Schritten erstellen" />
          <Quick href="/admin/team-management?tab=roster" icon="R" title="Kader" text="Roster, Starter, Planung und Rollen" />
          <Quick href="/admin/depth-chart" icon="≡" title="Depth Chart" text="Starter und Backups nach Position verwalten" />
        </div></AdminCard>
        <AdminCard><div className="cms-section-head"><div><small>ATHLETIC & ANALYSIS</small><h2>Erfassen oder analysieren</h2></div></div><div className="dashboard-quick-grid">
          <Quick href="/admin/training-operations" icon="△" title="Athletic / Training" text="Training planen, Attendance und Development bearbeiten" />
          <Quick href="/admin/player-analysis" icon="◎" title="Player 360" text="Leistung, Entwicklung, Stats und Trends analysieren" />
          <Quick href="/admin/performance" icon="⌁" title="Performance" text="Coach-Bewertungen und Leistungsdaten öffnen" />
          <Quick href="/admin/stats" icon="▥" title="Stats" text="Offizielle Spiel- und Saisonwerte prüfen" />
        </div></AdminCard>
      </section>

      <section className="dashboard-metrics"><Metric label="SPIELER" value={data.metrics.players} href="/admin/players"/><Metric label="COACHES" value={data.metrics.coaches} href="/admin/coaches"/><Metric label="SPIELE" value={data.metrics.games} href="/admin/game-operations"/><Metric label="NEWS LIVE" value={data.metrics.publishedNews} href="/admin/news"/><Metric label="SPONSOREN" value={data.metrics.sponsors} href="/admin/sponsors"/></section>

      {data.liveGame?<section className="dashboard-live-card"><div className="dashboard-live-head"><span>● LIVE</span><b>{data.liveGame.quarter||"GAME"}{data.liveGame.gameClock?` · ${data.liveGame.gameClock}`:""}</b></div><div className="dashboard-live-score"><div><img src="/rascals-logo-transparent-4k.png" alt=""/><span>RASCALS</span><strong>{data.liveGame.rascalsScore}</strong></div><em>:</em><div>{data.liveGame.opponentLogo?<img src={data.liveGame.opponentLogo} alt=""/>:<i>?</i>}<span>{data.liveGame.opponent}</span><strong>{data.liveGame.opponentScore}</strong></div></div><div className="dashboard-live-actions"><a href={`/admin/game-operations?game=${data.liveGame.id}&tab=live`}>Game Center öffnen →</a><a href={`/spielplan/${data.liveGame.slug}`} target="_blank">Öffentliche Seite ↗</a></div></section>:data.nextGame&&<section className="dashboard-next-card"><div><small>NÄCHSTES SPIEL</small><h3>{data.nextGame.homeAway==="home"?"RASCALS VS":"RASCALS @"} {data.nextGame.opponent}</h3><p>{formatDate(data.nextGame.kickoff)} · {data.nextGame.venue||(data.nextGame.homeAway==="home"?"Heimspiel":"Auswärtsspiel")}</p></div><div className="dashboard-next-logos"><img src="/rascals-logo-transparent-4k.png" alt=""/>{data.nextGame.opponentLogo?<img src={data.nextGame.opponentLogo} alt=""/>:<i>?</i>}</div><a href={`/admin/game-operations?game=${data.nextGame.id}`}>Game Center →</a></section>}

      <section className="dashboard-columns"><AdminCard><div className="cms-section-head"><div><small>FOOTBALL</small><h2>Scheme & Game Day</h2></div></div><div className="dashboard-quick-grid"><Quick href="/admin/playbook" icon="▤" title="Playbook & Lineup" text="Formationen, Plays und Lineup Simulation"/><Quick href="/admin/game-operations" icon="⚡" title="Game Center" text="Schedule, Gameday Roster, Live und Postgame"/></div></AdminCard><AdminCard><div className="cms-section-head"><div><small>WEBSITE</small><h2>Kommunikation</h2></div></div><div className="dashboard-quick-grid"><Quick href="/admin/news" icon="◆" title="News" text="Beiträge erstellen und veröffentlichen"/><Quick href="/admin/media" icon="◫" title="Medien" text="Bilder zentral verwalten"/><Quick href="/admin/sponsors" icon="◇" title="Sponsoren" text="Partner verwalten"/></div></AdminCard></section>
    </div>}
  </AdminShell>
}
function Metric({label,value,href}:{label:string;value:number;href:string}){return <a className="dashboard-metric" href={href}><small>{label}</small><strong>{value}</strong><span>Öffnen →</span></a>}
function Quick({href,icon,title,text}:{href:string;icon:string;title:string;text:string}){return <a className="dashboard-quick" href={href}><b>{icon}</b><span><strong>{title}</strong><small>{text}</small></span></a>}
function formatDate(value:string|null){if(!value)return "Termin offen";const date=new Date(value);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date)}
