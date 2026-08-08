"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./home-news-contrast.css";

type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  publishedAt: string | null;
};

type SponsorItem = {
  id: string;
  name: string;
  logo: string;
  url: string;
};

type GameItem = {
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
};

export function DynamicHomeFeeds() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [newsTarget, setNewsTarget] = useState<Element | null>(null);
  const [sponsorTarget, setSponsorTarget] = useState<Element | null>(null);
  const [gamesTarget, setGamesTarget] = useState<Element | null>(null);

  useEffect(() => {
    const newsGrid = document.querySelector(".news-preview .news-grid");
    const sponsorTrack = document.querySelector(".sponsor-strip .ticker-track");
    const fixtureList = document.querySelector(".fixtures-section .fixture-list");

    if (newsGrid) {
      newsGrid.innerHTML = "";
      setNewsTarget(newsGrid);
    }
    if (sponsorTrack) {
      sponsorTrack.innerHTML = "";
      setSponsorTarget(sponsorTrack);
    }
    if (fixtureList) {
      fixtureList.innerHTML = "";
      setGamesTarget(fixtureList);
    }

    Promise.all([
      fetch("/api/public/news").then((r) => r.ok ? r.json() : { items: [] }),
      fetch("/api/public/sponsors").then((r) => r.ok ? r.json() : { items: [] }),
      fetch("/api/public/games").then((r) => r.ok ? r.json() : { items: [] }),
    ]).then(([newsData, sponsorData, gameData]) => {
      setNews(newsData.items ?? []);
      setSponsors(sponsorData.items ?? []);
      setGames(gameData.items ?? []);
    }).catch(() => undefined);
  }, []);

  return (
    <>
      {gamesTarget && createPortal(
        <>
          {games.map((game, index) => {
            const date = game.kickoff ? new Date(game.kickoff) : null;
            const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }) : "TBD";
            const yearLabel = date && !Number.isNaN(date.getTime()) ? String(date.getFullYear()) : "2026";
            const place = game.homeAway === "home" ? `Heimspiel${game.venue ? ` · ${game.venue}` : ""}` : `Auswärts${game.venue ? ` · ${game.venue}` : ""}`;
            const showScore = game.status === "live" || game.status === "final";

            return (
              <article key={game.id}>
                <span className="game-number">{String(index + 1).padStart(2, "0")}</span>
                <time>{dateLabel}<small>{yearLabel}</small></time>
                <div className="matchup">
                  <strong>RASCALS</strong>
                  <b>{showScore ? `${game.rascalsScore}:${game.opponentScore}` : game.homeAway === "home" ? "VS" : "@"}</b>
                  <strong>{game.opponent.toUpperCase()}</strong>
                </div>
                <span className="place">{game.status === "live" ? `LIVE${game.quarter ? ` · ${game.quarter}` : ""}` : place}</span>
              </article>
            );
          })}
          {!games.length && (
            <article>
              <span className="game-number">01</span>
              <time>TBD<small>2026</small></time>
              <div className="matchup"><strong>RASCALS</strong><b>VS</b><strong>GEGNER</strong></div>
              <span className="place">Noch keine Spiele im CMS angelegt</span>
            </article>
          )}
        </>,
        gamesTarget,
      )}

      {newsTarget && createPortal(
        <>
          {news.map((item, index) => (
            <article key={item.id} className={index === 0 ? "featured-news" : "compact-news"}>
              {item.image && <img src={item.image} alt="" />}
              <div>
                <span>{item.category} · {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("de-DE") : ""}</span>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <a href={`/news/${item.slug}`}>Story lesen →</a>
              </div>
            </article>
          ))}
          {!news.length && (
            <article className="featured-news">
              <div>
                <span>NEWS</span>
                <h3>Noch keine veröffentlichten Beiträge</h3>
                <p>Neue Beiträge erscheinen hier automatisch, sobald sie im CMS veröffentlicht werden.</p>
                <a href="/news">Zur News-Seite →</a>
              </div>
            </article>
          )}
        </>,
        newsTarget,
      )}

      {sponsorTarget && createPortal(
        <>
          {[0, 1].map((sequence) => (
            <div className="ticker-sequence" key={sequence} aria-hidden={sequence === 1}>
              {(sponsors.length ? [...sponsors, ...sponsors, ...sponsors] : []).map((sponsor, index) => (
                <a
                  key={`${sequence}-${sponsor.id}-${index}`}
                  className="sponsor-logo"
                  href={sponsor.url || "/sponsoring"}
                  target={sponsor.url ? "_blank" : undefined}
                  rel={sponsor.url ? "noreferrer" : undefined}
                >
                  {sponsor.logo ? <img src={sponsor.logo} alt={sequence === 0 ? sponsor.name : ""} /> : <strong>{sponsor.name}</strong>}
                </a>
              ))}
            </div>
          ))}
        </>,
        sponsorTarget,
      )}
    </>
  );
}
