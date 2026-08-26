"use client";

import { useEffect, useState } from "react";

type NextGame = {
  slug: string;
  opponent: string;
  opponentLogo: string;
  venue: string;
  homeAway: string;
  kickoff: string | null;
  status: string;
};

function parts(msRemaining: number) {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Next-game panel for the "gameday" builder section.
 *
 * A club site's most-wanted fact is when the team plays next, so this
 * reads the live schedule and counts down to kickoff. It renders nothing
 * until a fixture is known, which keeps the section out of the way when
 * the season has not been entered yet.
 */
export function GamedayCountdown({ heading, kicker }: { heading?: string; kicker?: string }) {
  const [game, setGame] = useState<NextGame | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    fetch("/api/public/games")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { items?: NextGame[] } | null) => {
        if (!active || !data?.items?.length) return;
        const upcoming = data.items
          .filter((item) => item.status === "upcoming" && item.kickoff)
          .sort((a, b) => Date.parse(a.kickoff!) - Date.parse(b.kickoff!));
        const live = data.items.find((item) => item.status === "live");
        setGame(live ?? upcoming[0] ?? null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!game?.kickoff) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [game?.kickoff]);

  if (!game) return null;

  const kickoff = game.kickoff ? Date.parse(game.kickoff) : NaN;
  const isLive = game.status === "live";
  const remaining = Number.isFinite(kickoff) ? parts(kickoff - now) : null;
  const home = game.homeAway === "home";

  return (
    <div className="rascals-gameday">
      <div className="rascals-gameday-head">
        <span className="rascals-kicker">{isLive ? "● LIVE" : kicker || "NEXT GAME"}</span>
        <h2 data-split-reveal><span>{heading || (home ? "HEIMSPIEL" : "AUSWÄRTS")}</span></h2>
      </div>

      <div className="rascals-gameday-matchup">
        <span className="rascals-gameday-team">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <b>RASCALS</b>
        </span>
        <span className="rascals-gameday-vs">{home ? "VS" : "@"}</span>
        <span className="rascals-gameday-team">
          {game.opponentLogo ? <img src={game.opponentLogo} alt="" /> : <i aria-hidden="true" />}
          <b>{game.opponent}</b>
        </span>
      </div>

      <p className="rascals-gameday-meta">
        {Number.isFinite(kickoff)
          ? new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }).format(kickoff)
          : "Termin offen"}
        {game.venue ? ` · ${game.venue}` : ""}
      </p>

      {remaining && !isLive && (
        <div className="rascals-countdown" aria-label="Countdown bis zum Kickoff">
          <div><b>{remaining.days}</b><span>Tage</span></div>
          <div><b>{String(remaining.hours).padStart(2, "0")}</b><span>Std</span></div>
          <div><b>{String(remaining.minutes).padStart(2, "0")}</b><span>Min</span></div>
          <div><b>{String(remaining.seconds).padStart(2, "0")}</b><span>Sek</span></div>
        </div>
      )}

      <a className="sb-button" href={`/spielplan/${game.slug}`}>
        {isLive ? "Live-Ticker öffnen" : "Zum Spiel"}<span>→</span>
      </a>
    </div>
  );
}
