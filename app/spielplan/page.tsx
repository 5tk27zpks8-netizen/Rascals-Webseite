import { listGames, listGameEvents } from "../lib/football";
import "./spielplan.css";

export const metadata = { title: "Spielplan · Hellenstein Rascals", description: "Spielplan, Ergebnisse und Live-Updates der Hellenstein Rascals." };

export default async function SpielplanPage() {
  const games = await listGames();
  const live = games.find((game) => game.status === "live");
  const liveEvents = live ? await listGameEvents(live.id, 6) : [];

  return <main className="schedule-page">
    <header className="schedule-hero">
      <a href="/">← Startseite</a>
      <span>HELLENSTEIN RASCALS · 2026</span>
      <h1>SPIELPLAN & <i>ERGEBNISSE.</i></h1>
      <p>Alle Spiele, Ergebnisse und – wenn aktiviert – die wichtigsten Live-Updates vom Gameday.</p>
    </header>

    <section className="schedule-body">
      {live && <section className="live-panel">
        <div className="live-kicker"><b>● LIVE</b><span>{live.quarter || "GAME"}{live.gameClock ? ` · ${live.gameClock}` : ""}</span></div>
        <div className="live-score">
          <div><img src="/rascals-logo-transparent-4k.png" alt=""/><b>RASCALS</b><strong>{live.rascalsScore}</strong></div>
          <span>:</span>
          <div><img src={live.opponentLogo || "/rascals-logo-transparent-4k.png"} alt=""/><b>{live.opponent}</b><strong>{live.opponentScore}</strong></div>
        </div>
        {liveEvents.length > 0 && <div className="live-feed-mini">
          {liveEvents.map((event) => <div key={event.id}><span>{event.quarter}{event.gameClock ? ` · ${event.gameClock}` : ""}</span><b>{eventLabel(event.eventType)}</b><p>{event.playerName ? `${event.playerNumber != null ? `#${event.playerNumber} ` : ""}${event.playerName}` : event.text || "Gameday Update"}</p></div>)}
        </div>}
        <a className="live-more" href={`/spielplan/${live.slug}`}>Live-Ticker öffnen →</a>
      </section>}

      <div className="schedule-grid">
        {games.map((game) => <a className={`schedule-card ${game.status}`} key={game.id} href={`/spielplan/${game.slug}`}>
          <div className="schedule-card-top"><span>{formatDate(game.kickoff)}</span><b>{statusLabel(game.status)}</b></div>
          <div className="schedule-matchup">
            <div><img src="/rascals-logo-transparent-4k.png" alt=""/><strong>RASCALS</strong></div>
            <span>{game.homeAway === "home" ? "VS" : "@"}</span>
            <div>{game.opponentLogo ? <img src={game.opponentLogo} alt=""/> : <div className="schedule-logo-placeholder">?</div>}<strong>{game.opponent}</strong></div>
          </div>
          {(game.status === "live" || game.status === "final") && <div className="schedule-result"><strong>{game.rascalsScore}</strong><span>:</span><strong>{game.opponentScore}</strong></div>}
          <div className="schedule-card-bottom"><span>{game.venue || (game.homeAway === "home" ? "Heimspiel" : "Auswärtsspiel")}</span><span>Details →</span></div>
        </a>)}
      </div>

      {!games.length && <div className="schedule-empty">Der Spielplan wird hier automatisch angezeigt, sobald Spiele im CMS angelegt wurden.</div>}
    </section>
  </main>;
}

function formatDate(value: string | null) {
  if (!value) return "TERMIN OFFEN";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " · ");
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date).toUpperCase();
}

function statusLabel(status: string) {
  return ({ upcoming: "KOMMEND", live: "LIVE", final: "FINAL", postponed: "VERSCHOBEN", cancelled: "ABGESAGT" } as Record<string,string>)[status] || status.toUpperCase();
}

function eventLabel(type: string) {
  return ({ touchdown: "TOUCHDOWN", interception: "INTERCEPTION", sack: "SACK", halftime: "HALBZEIT", final: "SPIELENDE", custom: "UPDATE" } as Record<string,string>)[type] || type.toUpperCase();
}
