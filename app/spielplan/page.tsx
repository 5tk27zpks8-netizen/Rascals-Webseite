import { listGameEvents } from "../lib/football";
import { listVisibleGames } from "../lib/public-games";
import { ScheduleLogo } from "./ScheduleLogo";
import "./spielplan.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Spielplan · Hellenstein Rascals", description: "Spielplan, Ergebnisse und Live-Updates der Hellenstein Rascals." };

const RASCALS_LOGO = "/rascals-logo-transparent-4k.png";
type PublicGame = Awaited<ReturnType<typeof listVisibleGames>>[number];

export default async function SpielplanPage() {
  const games = await listVisibleGames();
  const live = games.find((game) => game.status === "live") ?? null;
  const liveEvents = live ? await listGameEvents(live.id, 6) : [];
  const upcomingAll = games.filter((game) => game.status === "upcoming").sort((a, b) => dateValue(a.kickoff) - dateValue(b.kickoff));
  const nextGame = upcomingAll[0] ?? null;
  const upcoming = live ? upcomingAll : upcomingAll.slice(1);
  const postponed = games.filter((game) => game.status === "postponed").sort((a, b) => dateValue(a.kickoff) - dateValue(b.kickoff));
  const completed = games.filter((game) => game.status === "final").sort((a, b) => dateValue(b.kickoff) - dateValue(a.kickoff));
  const latestCompleted = completed[0] ?? null;
  const feature = live ?? nextGame ?? latestCompleted;
  const featureMode: "live" | "next" | "result" = live ? "live" : nextGame ? "next" : "result";

  const wins = completed.filter((game) => game.rascalsScore > game.opponentScore).length;
  const losses = completed.filter((game) => game.rascalsScore < game.opponentScore).length;
  const draws = completed.filter((game) => game.rascalsScore === game.opponentScore).length;
  const pointsFor = completed.reduce((sum, game) => sum + game.rascalsScore, 0);
  const pointsAgainst = completed.reduce((sum, game) => sum + game.opponentScore, 0);

  return <main className="full-schedule-page">
    <header className="full-schedule-hero">
      <nav className="full-schedule-nav">
        <a className="full-schedule-brand" href="/"><ScheduleLogo src={RASCALS_LOGO} name="Hellenstein Rascals"/><span><b>HELLENSTEIN</b><strong>RASCALS</strong></span></a>
        <a className="full-schedule-back" href="/">← Startseite</a>
      </nav>
      <div className="full-schedule-hero-copy">
        <span>HELLENSTEIN RASCALS · SAISON 2026</span>
        <h1>SPIELPLAN<br/><i>& ERGEBNISSE.</i></h1>
        <p>Alle Begegnungen, Ergebnisse und Live-Updates der Rascals in einer klaren Saisonübersicht.</p>
      </div>
    </header>

    <div className="full-schedule-content">
      {feature && <FeatureGame game={feature} mode={featureMode}/>} 

      {completed.length > 0 && <section className="full-schedule-summary" aria-label="Saisonbilanz">
        <div className="full-schedule-summary-lead"><small>SAISON 2026</small><strong>{completed.length}</strong><span>GESPIELT</span></div>
        <Summary value={wins} label="SIEGE"/>
        <Summary value={losses} label="NIEDERLAGEN"/>
        {draws > 0 && <Summary value={draws} label="UNENTSCHIEDEN"/>}
        <Summary value={`${pointsFor}:${pointsAgainst}`} label="PUNKTE"/>
        <Summary value={signed(pointsFor - pointsAgainst)} label="DIFFERENZ"/>
      </section>}

      {live && liveEvents.length > 0 && <section className="full-schedule-live-feed">
        <SectionTitle kicker="LIVE" title="GAMEDAY UPDATES"/>
        <div className="full-schedule-events">{liveEvents.map((event) => <article key={event.id}><span>{event.quarter || "GAME"}{event.gameClock ? ` · ${event.gameClock}` : ""}</span><b>{eventLabel(event.eventType)}</b><p>{event.playerName ? `${event.playerNumber != null ? `#${event.playerNumber} ` : ""}${event.playerName}` : event.text || "Gameday Update"}</p></article>)}</div>
        <a className="full-schedule-text-link" href={`/spielplan/${live.slug}`}>Live-Ticker öffnen →</a>
      </section>}

      {upcoming.length > 0 && <ScheduleGroup title="KOMMENDE SPIELE" kicker="UPCOMING" games={upcoming}/>} 
      {postponed.length > 0 && <ScheduleGroup title="VERSCHOBENE SPIELE" kicker="STATUS" games={postponed}/>} 
      {completed.length > 0 && <ScheduleGroup title="ERGEBNISSE" kicker="FINAL" games={completed} results/>}
      {!games.length && <div className="full-schedule-empty">Der Spielplan wird hier automatisch angezeigt, sobald Spiele im CMS angelegt wurden.</div>}
    </div>
  </main>;
}

function FeatureGame({ game, mode }: { game: PublicGame; mode: "live" | "next" | "result" }) {
  const home = game.homeAway === "home";
  const left = home ? { name: "HELLENSTEIN RASCALS", logo: RASCALS_LOGO, score: game.rascalsScore } : { name: game.opponent, logo: game.opponentLogo, score: game.opponentScore };
  const right = home ? { name: game.opponent, logo: game.opponentLogo, score: game.opponentScore } : { name: "HELLENSTEIN RASCALS", logo: RASCALS_LOGO, score: game.rascalsScore };
  const scored = game.status === "final" || game.status === "live";
  const kicker = mode === "live" ? "● LIVE" : mode === "next" ? "NEXT UP" : "LETZTES ERGEBNIS";

  return <section className={`full-schedule-feature mode-${mode}`}>
    <div className="full-schedule-feature-head"><div><small>{kicker}</small><strong>{formatDate(game.kickoff)}</strong></div>{game.status === "final" && <span className={`full-schedule-result-pill ${resultClass(game)}`}>{resultLabel(game)}</span>}</div>
    <a href={`/spielplan/${game.slug}`} className="full-schedule-feature-main">
      <FeatureTeam name={left.name} logo={left.logo}/>
      <div className="full-schedule-feature-center">
        {scored ? <div className="full-schedule-feature-score"><strong>{left.score}</strong><span>:</span><strong>{right.score}</strong></div> : <div className="full-schedule-feature-vs">{home ? "VS" : "@"}</div>}
        <small>{game.status === "live" ? `${game.quarter || "LIVE"}${game.gameClock ? ` · ${game.gameClock}` : ""}` : game.venue || (home ? "Heimspiel" : "Auswärtsspiel")}</small>
      </div>
      <FeatureTeam name={right.name} logo={right.logo} right/>
    </a>
    <div className="full-schedule-feature-foot"><span>{home ? "HEIMSPIEL" : "AUSWÄRTS"} · {game.venue || "Ort offen"}</span><a href={`/spielplan/${game.slug}`}>Game Details →</a></div>
  </section>;
}

function FeatureTeam({ name, logo, right = false }: { name: string; logo: string; right?: boolean }) {
  return <div className={`full-schedule-feature-team ${right ? "right" : ""}`}><ScheduleLogo src={logo} name={name}/><strong>{name}</strong></div>;
}

function Summary({ value, label }: { value: string | number; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return <div className="full-schedule-section-title"><small>{kicker}</small><h2>{title}</h2></div>;
}

function ScheduleGroup({ title, kicker, games, results = false }: { title: string; kicker: string; games: PublicGame[]; results?: boolean }) {
  return <section className="full-schedule-group">
    <SectionTitle kicker={kicker} title={title}/>
    <div className="full-schedule-grid">{games.map((game) => <GameCard key={game.id} game={game} results={results}/>)}</div>
  </section>;
}

function GameCard({ game, results }: { game: PublicGame; results: boolean }) {
  const home = game.homeAway === "home";
  const scored = game.status === "final" || game.status === "live";
  return <a className={`full-schedule-card status-${game.status}`} href={`/spielplan/${game.slug}`}>
    <div className="full-schedule-card-top"><span>{formatDate(game.kickoff)}</span>{results ? <b className={`full-schedule-result-pill ${resultClass(game)}`}>{resultLabel(game)}</b> : <b>{statusLabel(game.status)}</b>}</div>
    <div className="full-schedule-card-matchup">
      <div><ScheduleLogo src={RASCALS_LOGO} name="Rascals"/><strong>RASCALS</strong></div>
      <div className="full-schedule-card-center">{scored ? <><strong>{game.rascalsScore}</strong><span>:</span><strong>{game.opponentScore}</strong></> : <b>{home ? "VS" : "@"}</b>}</div>
      <div><ScheduleLogo src={game.opponentLogo} name={game.opponent}/><strong>{game.opponent}</strong></div>
    </div>
    <div className="full-schedule-card-bottom"><span>{home ? "HOME" : "AWAY"} · {game.venue || "Ort offen"}</span><b>Details →</b></div>
  </a>;
}

function dateValue(value: string | null) { if (!value) return 0; const parsed = new Date(value).getTime(); return Number.isNaN(parsed) ? 0 : parsed; }
function formatDate(value: string | null) { if (!value) return "TERMIN OFFEN"; const date = new Date(value); if (Number.isNaN(date.getTime())) return value.replace("T", " · "); return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date).toUpperCase(); }
function statusLabel(status: string) { return ({ upcoming: "KOMMEND", live: "LIVE", final: "FINAL", postponed: "VERSCHOBEN", cancelled: "ABGESAGT" } as Record<string, string>)[status] || status.toUpperCase(); }
function resultLabel(game: { rascalsScore: number; opponentScore: number }) { if (game.rascalsScore > game.opponentScore) return "W · WIN"; if (game.rascalsScore < game.opponentScore) return "L · LOSS"; return "D · DRAW"; }
function resultClass(game: { rascalsScore: number; opponentScore: number }) { if (game.rascalsScore > game.opponentScore) return "win"; if (game.rascalsScore < game.opponentScore) return "loss"; return "draw"; }
function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function eventLabel(type: string) { return ({ touchdown: "TOUCHDOWN", interception: "INTERCEPTION", sack: "SACK", forced_fumble: "FORCED FUMBLE", halftime: "HALBZEIT", final: "SPIELENDE", custom: "UPDATE" } as Record<string, string>)[type] || type.toUpperCase(); }
