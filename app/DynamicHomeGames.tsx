"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { alternateMediaUrl, normalizeMediaUrl } from "./lib/media-url";

type Game = {
  id: string;
  slug: string;
  opponent: string;
  opponentLogo: string;
  venue: string;
  homeAway: "home" | "away";
  kickoff: string | null;
  status: "upcoming" | "live" | "final" | "postponed";
  rascalsScore: number;
  opponentScore: number;
  quarter: string;
};

type TeamData = { name: string; logo: string; score: number };

const RASCALS_LOGO = "/rascals-logo-transparent-4k.png";

export function DynamicHomeGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [league, setLeague] = useState("Bezirksliga");
  const [season, setSeason] = useState(2026);
  const [fixtureTarget, setFixtureTarget] = useState<Element | null>(null);
  const [miniTarget, setMiniTarget] = useState<Element | null>(null);
  const [statsTarget, setStatsTarget] = useState<Element | null>(null);

  useEffect(() => {
    const list = document.querySelector(".fixtures-section .fixture-list");
    const mini = document.querySelector(".schedule-card .mini-fixtures");
    const heading = document.querySelector(".fixtures-section .section-heading");

    if (list) {
      list.classList.add("dynamic-games-target");
      list.replaceChildren();
      setFixtureTarget(list);
    }
    if (mini) {
      mini.classList.add("dynamic-mini-target");
      mini.replaceChildren();
      setMiniTarget(mini);
    }
    if (heading) {
      const old = heading.querySelector(":scope > p");
      old?.remove();
      let target = heading.querySelector(".season-stats-target");
      if (!target) {
        target = document.createElement("div");
        target.className = "season-stats-target";
        heading.appendChild(target);
      }
      setStatsTarget(target);
    }

    fetch("/api/public/games", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((body: { items?: Game[]; league?: string; season?: number }) => {
        setGames((body.items ?? []).filter((game) => game.status !== "postponed" && !!game.opponent?.trim()));
        setLeague(body.league?.trim() || "Bezirksliga");
        setSeason(body.season || 2026);
      })
      .catch(() => setGames([]));

    return () => {
      setFixtureTarget(null);
      setMiniTarget(null);
      setStatsTarget(null);
    };
  }, []);

  const finalGames = useMemo(() => games.filter((game) => game.status === "final"), [games]);
  const calculated = useMemo(() => finalGames.reduce((sum, game) => ({
    pf: sum.pf + game.rascalsScore,
    pa: sum.pa + game.opponentScore,
    w: sum.w + (game.rascalsScore > game.opponentScore ? 1 : 0),
    l: sum.l + (game.rascalsScore < game.opponentScore ? 1 : 0),
  }), { pf: 0, pa: 0, w: 0, l: 0 }), [finalGames]);
  const stats = finalGames.length ? calculated : { pf: 161, pa: 43, w: 6, l: 2 };
  const homeGames = useMemo(() => homepageWindow(games), [games]);
  const mini = games.filter((game) => game.status === "live" || game.status === "upcoming").slice(0, 3);

  return <>
    {statsTarget && createPortal(
      <div className="season-stats" aria-label={`Saison ${season} Übersicht`}>
        <div className="season-league"><small>SAISON {season}</small><strong>{league.toUpperCase()}</strong></div>
        <div className="season-stat"><small>RECORD</small><strong>{stats.w}<i>–</i>{stats.l}</strong><span>W · L</span></div>
        <div className="season-stat"><small>POINTS</small><strong>{stats.pf}<i>:</i>{stats.pa}</strong><span>FOR · AGAINST</span></div>
      </div>,
      statsTarget,
    )}

    {fixtureTarget && createPortal(
      <div className="home-schedule">
        <div className="home-schedule-list">
          {homeGames.map((game) => <GameRow key={game.id} game={game}/>) }
          {!homeGames.length && <div className="home-games-empty">Noch keine Spiele im Spielplan eingetragen.</div>}
        </div>
        <div className="home-schedule-footer">
          <span>Aktuelle Auswahl aus der Saison {season}</span>
          <a href="/spielplan">Kompletter Spielplan <b>→</b></a>
        </div>
      </div>,
      fixtureTarget,
    )}

    {miniTarget && createPortal(<>
      {mini.map((game) => <div key={game.id}><b>{dateShort(game.kickoff)}</b><a href={`/spielplan/${game.slug}`}><span>{game.opponent}<small>{statusText(game)}</small></span></a></div>)}
      {!mini.length && <div><b>{season}</b><a href="/spielplan"><span>Spielplan öffnen<small>Alle Begegnungen ansehen</small></span></a></div>}
    </>, miniTarget)}
  </>;
}

function GameRow({ game }: { game: Game }) {
  const home = game.homeAway === "home";
  const left: TeamData = home
    ? { name: "HELLENSTEIN RASCALS", logo: RASCALS_LOGO, score: game.rascalsScore }
    : { name: game.opponent.toUpperCase(), logo: game.opponentLogo, score: game.opponentScore };
  const right: TeamData = home
    ? { name: game.opponent.toUpperCase(), logo: game.opponentLogo, score: game.opponentScore }
    : { name: "HELLENSTEIN RASCALS", logo: RASCALS_LOGO, score: game.rascalsScore };
  const outcome = resultText(game);
  const href = game.slug ? `/spielplan/${game.slug}` : "/spielplan";

  return <a className="home-game-card-link" href={href}>
    <article className={`home-game-card status-${game.status}`}>
      <div className="home-game-meta">
        <span className={`home-game-status ${game.status}`}>{game.status === "live" ? (game.quarter || "LIVE") : game.status === "final" ? "FINAL" : home ? "HOME" : "AWAY"}</span>
        <time dateTime={game.kickoff || undefined}>
          <b>{weekday(game.kickoff)}</b>
          <strong>{dateShort(game.kickoff)}</strong>
          <small>{timeShort(game.kickoff)}</small>
        </time>
      </div>

      <div className="home-game-matchup">
        <Team team={left}/>
        <div className="home-game-center">
          {game.status === "final" || game.status === "live" ? <>
            <div className="home-game-score"><span>{left.score}</span><b>:</b><span>{right.score}</span></div>
            {outcome && <strong className={`home-game-outcome ${outcome.toLowerCase()}`}>{outcome}</strong>}
            {game.status === "live" && <small className="home-game-live">LIVE</small>}
          </> : <>
            <div className="home-game-versus">VS</div>
            <small className="home-game-kickoff">{timeShort(game.kickoff)}</small>
          </>}
        </div>
        <Team team={right} right/>
      </div>

      <div className="home-game-venue">
        <small>{home ? "HEIMSPIEL" : "AUSWÄRTS"}</small>
        <strong>{game.venue || (home ? "Heidenheim" : "Auswärts")}</strong>
        <span>Game Details <b>→</b></span>
      </div>
    </article>
  </a>;
}

function Team({ team, right = false }: { team: TeamData; right?: boolean }) {
  return <div className={`home-game-team ${right ? "right" : "left"}`}>
    {!right && <Logo src={team.logo} name={team.name}/>}<strong>{team.name}</strong>{right && <Logo src={team.logo} name={team.name}/>} 
  </div>;
}

function Logo({ src, name }: { src: string; name: string }) {
  const primary = normalizeMediaUrl(src);
  const alternate = alternateMediaUrl(primary);
  const sources = useMemo(() => Array.from(new Set([primary, alternate].filter(Boolean))), [primary, alternate]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setFailed(false);
  }, [primary]);

  const current = sources[sourceIndex];
  if (!current || failed) return <span className="home-game-logo-placeholder" aria-label={`${name} Logo nicht verfügbar`}>{initials(name)}</span>;

  return <img
    className="home-game-logo"
    src={current}
    alt={`${name} Logo`}
    loading="eager"
    decoding="async"
    referrerPolicy="no-referrer"
    onError={() => {
      if (sourceIndex + 1 < sources.length) setSourceIndex((index) => index + 1);
      else setFailed(true);
    }}
  />;
}

function homepageWindow(games: Game[]) {
  if (games.length <= 4) return games;
  const liveIndex = games.findIndex((game) => game.status === "live");
  const upcomingIndex = games.findIndex((game) => game.status === "upcoming");
  const pivot = liveIndex >= 0 ? liveIndex : upcomingIndex;

  if (pivot >= 0) {
    const previousFinal = games.slice(0, pivot).filter((game) => game.status === "final").slice(-1);
    const forward = games.slice(pivot).filter((game) => game.status === "live" || game.status === "upcoming").slice(0, 4 - previousFinal.length);
    return [...previousFinal, ...forward];
  }
  return games.filter((game) => game.status === "final").slice(-4);
}

function initials(name: string) {
  const parts = name.replace(/[^A-ZÄÖÜ0-9 ]/gi, " ").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function parsedDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateShort(value: string | null) {
  const date = parsedDate(value);
  return date ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(date) : "TBD";
}

function weekday(value: string | null) {
  const date = parsedDate(value);
  return date ? new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date).replace(".", "").toUpperCase() : "DATE";
}

function timeShort(value: string | null) {
  const date = parsedDate(value);
  return date ? `${new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date)} UHR` : "KICKOFF TBD";
}

function resultText(game: Game) {
  if (game.status !== "final") return "";
  if (game.rascalsScore > game.opponentScore) return "WIN";
  if (game.rascalsScore < game.opponentScore) return "LOSE";
  return "DRAW";
}

function statusText(game: Game) {
  if (game.status === "live") return `${game.quarter || "LIVE"} · ${game.rascalsScore}:${game.opponentScore}`;
  if (game.status === "final") return `FINAL · ${game.rascalsScore}:${game.opponentScore} · ${resultText(game)}`;
  return game.homeAway === "home" ? "HEIMSPIEL" : "AUSWÄRTS";
}
