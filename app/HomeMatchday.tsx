import { Header } from "./SiteShell";
import { RascalsField } from "./RascalsField";
import { MatchdayHero } from "./MatchdayHero";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import "./home-matchday.css";

/**
 * A second design for the homepage, built to be compared against the current
 * one rather than to replace it quietly.
 *
 * The brief was a genuinely different site, so the departures are structural,
 * not cosmetic:
 *
 *  - It opens on the next fixture, not on a photograph. A club site exists to
 *    answer "when do we play"; the current page answers "we have a helmet".
 *  - The base flips from all-navy to paper. Every football club site is dark
 *    navy; a matchday programme in print is not, and that single change is
 *    what makes this read as another site at a glance.
 *  - Sections are numbered like drives and separated by yard lines, so the
 *    football motif carries the structure instead of decorating it.
 *  - Photography drops to texture. Type and numbers carry the page.
 *
 * Brand colours, wordmark, fonts and every URL stay exactly as they are.
 */

const units = [
  {
    name: "OFFENSE",
    line: "Ball. Yards. Punkte.",
    text: "Line, Backfield und Receiver — elf Spieler, ein Spielzug, kein Alleingang.",
    image: "/team-players-4k.webp",
  },
  {
    name: "DEFENSE",
    line: "Stoppen. Zurückholen.",
    text: "Front, Linebacker und Secondary. Wer hier steht, gibt keinen Meter freiwillig her.",
    image: "/team-huddle-4k.webp",
  },
  {
    name: "SPECIAL TEAMS",
    line: "Ein Snap entscheidet.",
    text: "Kick, Punt, Return. Die Phase, die Spiele dreht und die keiner trainiert sehen will.",
    image: "/team-walk-4k.webp",
  },
];

const squads = [
  { tag: "SENIORS · AB 18", name: "TACKLE FOOTBALL", text: "Wettkampf, Technik und Athletik – mit einem Team, das dich fordert und trägt.", image: "/team-walk-4k.webp" },
  { tag: "JUNIORS · 14–18", name: "NEXT GENERATION", text: "Grundlagen sicher lernen, Verantwortung übernehmen und als Spieler wachsen.", image: "/team-juniors-new-4k.webp" },
];

function SectionNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="md-marker" data-reveal>
      <span className="md-marker-num">{value}</span>
      <span className="md-marker-label">{label}</span>
    </div>
  );
}

export function HomeMatchday() {
  return (
    <div className="md-page">
      <Header page="home" />

      <div className="md-sideline" aria-hidden="true">
        <span>HELLENSTEIN RASCALS · AMERICAN FOOTBALL · HEIDENHEIM</span>
      </div>

      <main className="md-main">
        {/* 01 — the next fixture is the hero */}
        <section className="md-hero">
          <div className="md-hero-copy">
            <SectionNumber value="01" label="NEXT GAME" />
            <MatchdayHero />
          </div>
          <div className="md-hero-media">
            <img src="/team-entry-4k.webp" alt="Die Hellenstein Rascals laufen zum Spiel ein" />
          </div>
        </section>

        <hr className="rascals-yardline" />

        {/* 02 — the season, as numbers */}
        <section className="md-season">
          <SectionNumber value="02" label="SAISON 2026" />
          <div className="md-season-grid">
            <article data-reveal><b>2023</b><span>Gegründet</span></article>
            <article data-reveal data-reveal-delay="70"><b data-count="11">11</b><span>Spieler auf dem Feld</span></article>
            <article data-reveal data-reveal-delay="140"><b>1</b><span>Rascals Family</span></article>
            <article data-reveal data-reveal-delay="210"><b data-count="100" data-count-suffix="%">100%</b><span>Heidenheim</span></article>
          </div>
        </section>

        {/* 03 — the schedule, on the field */}
        <section id="spielplan" className="section fixtures-section md-fixtures">
          <RascalsField />
          <SectionNumber value="03" label="SPIELPLAN" />
          <div className="section-heading">
            <div>
              <h2>ALLE <i>GAMES.</i></h2>
            </div>
            <p>Bestätigte Begegnungen der Rascals in dieser Saison.</p>
          </div>
          {/* The schedule component fills this and appends its own
              "kompletter Spielplan" link, so this section adds neither. */}
          <div className="fixture-list" />
        </section>

        {/* 04 — the teams, below the schedule */}
        <section className="md-teams">
          <SectionNumber value="04" label="DIE TEAMS" />
          <h2 data-reveal>DREI UNITS.<br /><i>EIN TEAM.</i></h2>

          <div className="md-units">
            {units.map((unit, index) => (
              <article key={unit.name} data-reveal data-reveal-delay={index * 90}>
                <div className="md-unit-media">
                  <img src={unit.image} alt="" />
                  <span className="md-unit-index">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3>{unit.name}</h3>
                <strong>{unit.line}</strong>
                <p>{unit.text}</p>
              </article>
            ))}
          </div>

          <div className="md-squads">
            {squads.map((squad, index) => (
              <article key={squad.name} data-reveal data-reveal-delay={index * 90}>
                <img src={squad.image} alt="" />
                <div>
                  <small>{squad.tag}</small>
                  <h3>{squad.name}</h3>
                  <p>{squad.text}</p>
                  <a className="md-link" href="/team">Zum Team →</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <hr className="rascals-yardline" />

        {/* 05 — the club */}
        <section className="md-club">
          <SectionNumber value="05" label="DER VEREIN" />
          <div className="md-club-grid">
            <blockquote data-reveal>
              NO ONE<br /><i>FIGHTS ALONE.</i>
            </blockquote>
            <div className="md-club-copy">
              <p data-reveal data-reveal-delay="80">Seit 2023 bringen wir American Football zurück unter den Hellenstein. Bei uns zählen Einsatz, Fairness und der Mensch unter dem Helm.</p>
              <p data-reveal data-reveal-delay="140">Ob Rookie oder Veteran: Wer für das Team alles gibt, gehört dazu. Football-Erfahrung ist für den Einstieg nicht nötig — Motivation und Verlässlichkeit schon.</p>
              <a className="md-link" href="/ueber-uns" data-reveal data-reveal-delay="200">Unsere Geschichte →</a>
            </div>
          </div>
        </section>

        {/* 06 — news */}
        <section className="section news-preview md-news">
          <SectionNumber value="06" label="AUS DEM HUDDLE" />
          <div className="section-heading">
            <div><h2>NEUES VOM <i>TEAM.</i></h2></div>
          </div>
          <div className="news-grid" />
          <a className="md-link" href="/news">Alle News →</a>
        </section>

        {/* 07 — join */}
        <section className="md-join">
          <img className="md-join-image" src="/team-celebrate-4k.webp" alt="" data-parallax="8" />
          <div className="md-join-shade" />
          <div className="md-join-copy">
            <SectionNumber value="07" label="YOUR NEXT PLAY" />
            <h2 data-split-reveal><span>READY TO JOIN</span><br /><i>THE FAMILY?</i></h2>
            <p data-reveal data-reveal-delay="140">Du brauchst keine Erfahrung. Nur den Willen, jede Woche wiederzukommen.</p>
            <a className="md-cta" href="mailto:football@hsb1846.de" data-reveal data-reveal-delay="200">Probetraining anfragen →</a>
          </div>
        </section>
      </main>

      <footer className="md-footer">
        <div>
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span>HELLENSTEIN RASCALS</span>
          <small>American Football · Eine Abteilung des Heidenheimer Sportbund 1846 e.V.</small>
        </div>
        <nav>
          <a href="/spielplan">Spielplan</a>
          <a href="/team">Team</a>
          <a href="/ueber-uns">Über uns</a>
          <a href="/news">News</a>
          <a href="/galerie">Galerie</a>
          <a href="/sponsoring">Sponsoring</a>
        </nav>
      </footer>

      <DynamicHomeGames />
      <DynamicHomeFeeds />
    </div>
  );
}
