import { listPublicTeamPlayers } from "../lib/public-team-players";
import { listActiveCoaches } from "../lib/coaches";
import { Header } from "../SiteShell";
import { RascalsPlayerCard } from "./RascalsPlayerCard";
import "./team.css";
import "./coaches-public.css";
import "./team-sections.css";
import { siteBrand } from "../lib/brand-server";

export const metadata = {
  title: "Team · Hellenstein Rascals",
  description: "Coaches und Kader der Hellenstein Rascals.",
};

export default async function TeamPage() {
  const [players, coaches] = await Promise.all([listPublicTeamPlayers(), listActiveCoaches()]);
  /* ONE ROSTER.

     This page used to be three: Offense, Defense, Special Teams, each with
     its own heading and its own grid, filled by the unit written against a
     player in the CMS. That is how a squad of a hundred is organised. It is
     not how this one plays — everybody here plays both ways — and the split
     mostly produced a Special Teams heading over nobody and a Defense
     heading over almost everybody, which says less than no heading at all.

     So: one roster, in the order a squad is read out. */

  const brand = await siteBrand();

  return (
    <>
    <Header page="team" brand={brand} />
    <main className="team-public team-public-v2">
      <header className="team-public-head team-public-hero">
        <span>HELLENSTEIN RASCALS · 2026</span>
        <h1>ONE TEAM.<br /><i>ALL IN.</i></h1>
        <p>Die Coaches geben die Richtung vor. Der Kader bringt sie auf das Feld.</p>
        <nav className="team-jump-nav" aria-label="Team Bereiche">
          <a href="#coaches">Coaches</a>
          <a href="#kader">Kader</a>
        </nav>

        {/* The way into the arena. It is not a fourth jump link: those move you
            down this page, this one leaves it, and a control that does
            something different should look like it does. The still is a real
            frame out of the scene rather than an illustration of it, so what
            the button shows is what opening it gives you. */}
        <a className="arena-portal" href="/arena/kader">
          <img src="/arena-portal.webp" alt="" width={1920} height={740} />
          <span className="arena-portal-text">
            <small>Teamvorstellung</small>
            <strong>IN DIE ARENA</strong>
            <em>Scroll dich durch das Stadion — Spieler für Spieler.</em>
          </span>
          <span className="arena-portal-go" aria-hidden="true">▶</span>
        </a>
      </header>

      <section className="team-public-body team-public-body-v2">
        {coaches.length > 0 && (
          <section id="coaches" className="team-showcase team-showcase-coaches coaches-public-section">
            <div className="team-section-head">
              <div><small>01 · LEADERSHIP</small><h2>COACHES</h2></div>
              <p>Vision, Vorbereitung und Verantwortung. Unser Coaching Staff setzt den Standard für das Team.</p>
            </div>
            <div className="coaches-public-grid">
              {coaches.map((coach) => (
                <article className="coach-public-card" key={coach.id}>
                  <div className="coach-public-photo">
                    {coach.photo ? <img src={coach.photo} alt={`${coach.firstName} ${coach.lastName}`} /> : <div className="coach-public-placeholder">R</div>}
                    <img className="coach-public-watermark" src="/rascals-logo-1600.webp" alt="" />
                  </div>
                  <div className="coach-public-info">
                    <span>{coach.role || "COACH"}</span>
                    <h3>{coach.firstName}<br />{coach.lastName}</h3>
                    {coach.bio && <p>{coach.bio}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {players.length > 0 && (
          <section id="kader" className="team-showcase team-showcase-roster">
            <div className="team-section-head">
              <div><small>02 · ALL IN</small><h2>KADER</h2></div>
              <p>Jeder Name, eine Mannschaft. Wer hier steht, spielt da, wo das Team ihn braucht.</p>
            </div>
            <div className="team-roster-grid">{players.map((player) => <RascalsPlayerCard key={player.id} player={player} />)}</div>
          </section>
        )}

        {!players.length && !coaches.length && <div className="team-empty">Teammitglieder erscheinen hier automatisch, sobald sie im CMS angelegt und öffentlich sichtbar sind.</div>}
      </section>
    </main>
    </>
  );
}
