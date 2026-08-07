"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Game = {
  id: string;
  slug: string;
  opponent: string;
  venue: string;
  homeAway: "home" | "away";
  kickoff: string | null;
  status: "upcoming" | "live" | "final" | "postponed";
  rascalsScore: number;
  opponentScore: number;
  quarter: string;
};

export function DynamicHomeGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [fixtureTarget, setFixtureTarget] = useState<Element | null>(null);
  const [miniTarget, setMiniTarget] = useState<Element | null>(null);

  useEffect(() => {
    const fixtureList = document.querySelector(".fixtures-section .fixture-list");
    const miniFixtures = document.querySelector(".schedule-card .mini-fixtures");

    document.querySelectorAll<HTMLAnchorElement>('a[href="#spielplan"]').forEach((link) => {
      link.href = "/spielplan";
    });

    if (fixtureList) {
      fixtureList.innerHTML = "";
      setFixtureTarget(fixtureList);
    }
    if (miniFixtures) {
      miniFixtures.innerHTML = "";
      setMiniTarget(miniFixtures);
    }

    fetch("/api/public/games")
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((body: { items?: Game[] }) => setGames((body.items ?? []).filter((game) => game.status !== "postponed")))
      .catch(() => setGames([]));
  }, []);

  const visible = games.slice(0, 4);
  const mini = games.filter((game) => game.status === "live" || game.status === "upcoming").slice(0, 3);

  return <>
    {fixtureTarget && createPortal(
      <>
        {visible.map((game, index) => (
          <a href={`/spielplan/${game.slug}`} key={game.id}>
            <article>
              <span className="game-number">{String(index + 1).padStart(2, "0")}</span>
              <time>{dateDay(game.kickoff)}<small>{dateYear(game.kickoff)}</small></time>
              <div className="matchup">
                <strong>RASCALS</strong><b>{game.homeAway === "home" ? "VS" : "@"}</b><strong>{game.opponent.toUpperCase()}</strong>
              </div>
              <span className="place">{statusText(game)} · {game.venue || (game.homeAway === "home" ? "Heimspiel" : "Auswärts")}</span>
            </article>
          </a>
        ))}
        {!visible.length && <article><span className="game-number">—</span><time>TBD<small>2026</small></time><div className="matchup"><strong>NOCH KEINE SPIELE</strong></div><span className="place">Im CMS anlegen</span></article>}
      </>,
      fixtureTarget,
    )}

    {miniTarget && createPortal(
      <>
        {mini.map((game) => (
          <div key={game.id}>
            <b>{dateShort(game.kickoff)}</b>
            <a href={`/spielplan/${game.slug}`}><span>{game.opponent}<small>{statusText(game)}</small></span></a>
          </div>
        ))}
        {!mini.length && <div><b>2026</b><a href="/spielplan"><span>Spielplan öffnen<small>Alle Begegnungen ansehen</small></span></a></div>}
      </>,
      miniTarget,
    )}
  </>;
}

function dateShort(value: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "TBD" : new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(date);
}

function dateDay(value: string | null) {
  return dateShort(value);
}

function dateYear(value: string | null) {
  if (!value) return "2026";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "2026" : String(date.getFullYear());
}

function statusText(game: Game) {
  if (game.status === "live") return `${game.quarter || "LIVE"} · ${game.rascalsScore}:${game.opponentScore}`;
  if (game.status === "final") return `FINAL · ${game.rascalsScore}:${game.opponentScore}`;
  return game.homeAway === "home" ? "HEIMSPIEL" : "AUSWÄRTS";
}
