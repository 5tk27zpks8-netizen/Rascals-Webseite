"use client";

import { useEffect, useState } from "react";

type NextGame = {
  slug: string;
  opponent: string;
  venue: string;
  homeAway: string;
  kickoff: string | null;
  status: string;
};

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function countdown(msRemaining: number) {
  const total = Math.max(0, Math.floor(msRemaining / 1000));
  return [
    { value: Math.floor(total / 86400), label: "TAGE" },
    { value: Math.floor((total % 86400) / 3600), label: "STD" },
    { value: Math.floor((total % 3600) / 60), label: "MIN" },
    { value: total % 60, label: "SEK" },
  ];
}

/**
 * The homepage opener: the next fixture, set as type.
 *
 * Until a fixture exists it falls back to the club's own name rather than
 * rendering nothing, because this is the top of the page — an empty hero
 * would be worse than a plain one.
 */
export function MatchdayHero() {
  const [game, setGame] = useState<NextGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    fetch("/api/public/games")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active) return;
        const games: NextGame[] = Array.isArray(data?.items) ? data.items : [];
        const live = games.find((entry) => entry.status === "live");
        const upcoming = games
          .filter((entry) => entry.status === "upcoming" && entry.kickoff)
          .sort((a, b) => Date.parse(a.kickoff ?? "") - Date.parse(b.kickoff ?? ""))[0];
        setGame(live ?? upcoming ?? null);
        setLoaded(true);
      })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!game?.kickoff) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [game?.kickoff]);

  if (!loaded || !game) {
    return (
      <div className="md-fixture">
        <span className="md-fixture-kicker">AMERICAN FOOTBALL · HEIDENHEIM</span>
        <h1><span>HELLENSTEIN</span><br /><i>RASCALS.</i></h1>
        <p className="md-fixture-note">
          {loaded ? "Der Spielplan für die neue Saison steht noch nicht fest." : " "}
        </p>
      </div>
    );
  }

  const kickoff = game.kickoff ? new Date(game.kickoff) : null;
  const isLive = game.status === "live";
  const isHome = game.homeAway === "home";
  const remaining = kickoff ? kickoff.getTime() - now : 0;

  return (
    <div className="md-fixture">
      <span className="md-fixture-kicker">
        {isLive ? "JETZT LIVE" : isHome ? "NÄCHSTES HEIMSPIEL" : "NÄCHSTES AUSWÄRTSSPIEL"}
      </span>

      <h1>
        <span>RASCALS</span>
        <em>{isHome ? "vs" : "@"}</em>
        <i>{game.opponent}</i>
      </h1>

      <dl className="md-fixture-meta">
        {kickoff && (
          <div>
            <dt>Anstoß</dt>
            <dd>
              {WEEKDAYS[kickoff.getDay()]}, {kickoff.getDate()}. {MONTHS[kickoff.getMonth()]}
              {" · "}
              {String(kickoff.getHours()).padStart(2, "0")}:{String(kickoff.getMinutes()).padStart(2, "0")} Uhr
            </dd>
          </div>
        )}
        {game.venue && (
          <div>
            <dt>Ort</dt>
            <dd>{game.venue}</dd>
          </div>
        )}
      </dl>

      {isLive ? (
        <a className="md-cta live" href={`/spielplan/${game.slug}`}>Zum Live-Ticker →</a>
      ) : (
        kickoff && remaining > 0 && (
          <div className="md-countdown" aria-label="Zeit bis zum Anstoß">
            {countdown(remaining).map((part) => (
              <span key={part.label}>
                <b>{String(part.value).padStart(2, "0")}</b>
                <small>{part.label}</small>
              </span>
            ))}
          </div>
        )
      )}

      <div className="md-fixture-actions">
        <a className="md-cta" href="mailto:football@hsb1846.de">Teil des Teams werden</a>
        <a className="md-link" href="/spielplan">Spielplan ansehen →</a>
      </div>
    </div>
  );
}
