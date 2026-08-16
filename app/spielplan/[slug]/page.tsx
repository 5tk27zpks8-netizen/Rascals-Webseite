import { notFound } from "next/navigation";
import { getGameBySlug, listGameEvents } from "../../lib/football";
import { ScheduleLogo } from "../ScheduleLogo";
import "../spielplan.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();
  const events = await listGameEvents(game.id, 50);

  return <main className="schedule-page">
    <header className="schedule-hero">
      <a href="/spielplan">← Spielplan</a>
      <span>{game.status === "live" ? "LIVE GAMEDAY" : "HELLENSTEIN RASCALS"}</span>
      <h1>{game.homeAway === "home" ? "RASCALS VS." : "RASCALS @"} <i>{game.opponent.toUpperCase()}</i></h1>
      <p>{formatDate(game.kickoff)}{game.venue ? ` · ${game.venue}` : ""}</p>
    </header>

    <section className="schedule-body">
      <section className={`live-panel ${game.status === "live" ? "is-live" : ""}`}>
        <div className="live-kicker"><b>{game.status === "live" ? "● LIVE" : statusLabel(game.status)}</b><span>{game.quarter || ""}{game.gameClock ? ` · ${game.gameClock}` : ""}</span></div>
        <div className="live-score">
          <div><ScheduleLogo src="/rascals-logo-transparent-4k.png" name="Hellenstein Rascals" className="detail-game-logo"/><b>RASCALS</b><strong>{game.rascalsScore}</strong></div>
          <span>:</span>
          <div><ScheduleLogo src={game.opponentLogo} name={game.opponent} className="detail-game-logo"/><b>{game.opponent}</b><strong>{game.opponentScore}</strong></div>
        </div>
      </section>

      <section className="ticker-full">
        <div className="ticker-heading"><span>GAMEDAY</span><h2>LIVE-TICKER</h2></div>
        {events.length ? <div className="ticker-list">{events.map((event) => <article key={event.id}>
          <div className="ticker-time"><b>{event.quarter || "UPDATE"}</b><span>{event.gameClock || ""}</span></div>
          <div className="ticker-event"><small>{eventLabel(event.eventType)}</small><h3>{event.playerName ? `${event.playerNumber != null ? `#${event.playerNumber} ` : ""}${event.playerName}` : event.text || "Gameday Update"}</h3>{event.playerName && event.text ? <p>{event.text}</p> : null}</div>
        </article>)}</div> : <div className="schedule-empty">Für dieses Spiel gibt es noch keine Ticker-Einträge.</div>}
      </section>
    </section>
  </main>;
}

function formatDate(value: string | null) {
  if (!value) return "Termin offen";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ");
  return new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusLabel(status: string) {
  return ({ upcoming: "KOMMEND", live: "● LIVE", final: "FINAL", postponed: "VERSCHOBEN", cancelled: "ABGESAGT" } as Record<string,string>)[status] || status.toUpperCase();
}

function eventLabel(type: string) {
  return ({ touchdown: "TOUCHDOWN", interception: "INTERCEPTION", sack: "SACK", halftime: "HALBZEIT", final: "SPIELENDE", custom: "UPDATE" } as Record<string,string>)[type] || type.toUpperCase();
}
