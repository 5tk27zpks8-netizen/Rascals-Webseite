import { ArenaDrive } from "./ArenaDrive";
import { MatchdayHero } from "./MatchdayHero";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import "./home-arena.css";

/**
 * ARENA — THE DRIVE.
 *
 * A onepager built as a possession rather than a page. Scrolling walks the
 * camera down a real, painted field from the Rascals' own 20 to the
 * opponent's end zone; each panel arrives at the yard marker it belongs to,
 * and a broadcast overlay counts the drive down alongside it. There is no
 * header, no hero-then-sections stack, no footer in the usual sense — the
 * structure is the field.
 *
 * Everything the site has to say lives inside the drive: the next game, the
 * club in numbers, the teams, the full schedule and the news, in that order.
 * Nothing is pushed onto a separate page to keep the drive tidy — the whole
 * homepage is one possession.
 *
 * The navigation is the chain: the yard markers double as jump links, so the
 * one thing a visitor always has is a way to skip ahead.
 *
 * Everything is plain HTML in document order. Where the drive cannot run —
 * phones, coarse pointers, reduced motion — the panels simply stack and the
 * page reads top to bottom like any other.
 */

/**
 * The stops of the drive. The yard on each marker is the ball position the
 * overlay actually reads at that point in the scroll, so the chain and the
 * broadcast never contradict each other.
 */
const drivePanels = [
  { id: "kickoff", yard: "OWN 20", label: "KICKOFF" },
  { id: "nextgame", yard: "OWN 29", label: "1ST & 10" },
  { id: "zahlen", yard: "OWN 39", label: "2ND & 6" },
  { id: "team", yard: "50", label: "1ST & 10" },
  { id: "spielplan", yard: "OPP 38", label: "2ND & 7" },
  { id: "news", yard: "OPP 24", label: "1ST & 10" },
  { id: "mitmachen", yard: "OPP 11", label: "TOUCHDOWN" },
];

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
    text: "Kick, Punt, Return. Die Phase, die Spiele dreht.",
    image: "/team-walk-4k.webp",
  },
];

const squads = [
  {
    tag: "SENIORS · AB 18",
    name: "TACKLE FOOTBALL",
    text: "Wettkampf, Technik und Athletik – mit einem Team, das dich fordert und trägt.",
    image: "/team-walk-4k.webp",
  },
  {
    tag: "JUNIORS · 14–18",
    name: "NEXT GENERATION",
    text: "Grundlagen sicher lernen, Verantwortung übernehmen und als Spieler wachsen.",
    image: "/team-juniors-new-4k.webp",
  },
];

export function HomeArena() {
  return (
    <div className="drive-page">
      <ArenaDrive />
      <div className="drive-vignette" aria-hidden="true" />

      {/* --- broadcast overlay ------------------------------------- */}
      <div className="drive-hud">
        <a className="drive-hud-brand" href="/">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span>HELLENSTEIN<br /><i>RASCALS</i></span>
        </a>

        <div className="drive-hud-centre">
          <span className="drive-hud-down" data-hud-down>KICKOFF</span>
          <div className="drive-hud-bar" data-hud-bar><i /></div>
        </div>

        <div className="drive-hud-yard">
          <small>BALL ON</small>
          <b data-hud-yard>OWN 20</b>
        </div>
      </div>

      {/* --- the chain: navigation as yard markers ------------------ */}
      <nav className="drive-chain" aria-label="Abschnitte">
        {drivePanels.map((panel) => (
          <a key={panel.id} href={`#${panel.id}`}>
            <span>{panel.yard}</span>
            <small>{panel.label}</small>
          </a>
        ))}
      </nav>

      <main className="drive-track">
        {/* KICKOFF */}
        <section id="kickoff" className="drive-panel drive-panel-open" data-from="0" data-to="0.11">
          <p className="drive-eyebrow">Kickoff · Own 20</p>
          <h1>
            <span>DIESE</span>
            <span>YARDS</span>
            <i>GEHÖREN UNS.</i>
          </h1>
          <p className="drive-lead">
            Hellenstein Rascals — American Football in Heidenheim. Scroll dich mit uns
            über das Feld, von der eigenen 20 bis in die Endzone.
          </p>
          <span className="drive-hint">Scrollen startet den Drive ↓</span>
        </section>

        {/* 1ST & 10 — next game */}
        <section id="nextgame" className="drive-panel" data-from="0.11" data-to="0.24">
          <p className="drive-eyebrow">1st &amp; 10 · Own 29</p>
          <div className="drive-fixture"><MatchdayHero /></div>
        </section>

        {/* 2ND & 6 — the club in numbers */}
        <section id="zahlen" className="drive-panel" data-from="0.24" data-to="0.37">
          <p className="drive-eyebrow">2nd &amp; 6 · Own 39</p>
          <h2>DER VEREIN<br /><i>IN ZAHLEN.</i></h2>
          <div className="drive-numbers">
            <article><b>2023</b><span>Gegründet</span></article>
            <article><b>11</b><span>Spieler auf dem Feld</span></article>
            <article><b>1</b><span>Rascals Family</span></article>
            <article><b>100%</b><span>Heidenheim</span></article>
          </div>
          <p className="drive-lead">
            Seit 2023 zurück unter dem Hellenstein. Bei uns zählen Einsatz, Fairness und
            der Mensch unter dem Helm.
          </p>
          <a className="drive-link" href="/ueber-uns">Die ganze Vereinsgeschichte →</a>
        </section>

        {/* 1ST & 10 at midfield — the teams */}
        <section id="team" className="drive-panel is-wide" data-from="0.37" data-to="0.53">
          <p className="drive-eyebrow">1st &amp; 10 · Midfield</p>
          <h2>DREI UNITS. <i>EIN TEAM.</i></h2>

          <div className="drive-units">
            {units.map((unit, index) => (
              <article key={unit.name}>
                <div className="drive-unit-media">
                  <img src={unit.image} alt="" loading="lazy" />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3>{unit.name}</h3>
                <strong>{unit.line}</strong>
                <p>{unit.text}</p>
              </article>
            ))}
          </div>

          <div className="drive-squads">
            {squads.map((squad) => (
              <article key={squad.name}>
                <img src={squad.image} alt="" loading="lazy" />
                <div>
                  <small>{squad.tag}</small>
                  <h3>{squad.name}</h3>
                  <p>{squad.text}</p>
                </div>
              </article>
            ))}
          </div>

          <a className="drive-link" href="/team">Zum kompletten Roster →</a>
        </section>

        {/* 2ND & 7 — the schedule */}
        <section id="spielplan" className="drive-panel is-wide section fixtures-section drive-fixtures" data-from="0.53" data-to="0.7">
          <p className="drive-eyebrow">2nd &amp; 7 · Opp 38</p>
          <div className="section-heading">
            <div><h2>NÄCHSTE <i>GAMES.</i></h2></div>
          </div>
          <div className="drive-scroller">
            <div className="fixture-list" />
          </div>
        </section>

        {/* 1ST & 10 — the news */}
        <section id="news" className="drive-panel is-wide news-preview drive-news" data-from="0.7" data-to="0.86">
          <p className="drive-eyebrow">1st &amp; 10 · Opp 24</p>
          <h2>AUS DEM <i>HUDDLE.</i></h2>
          <div className="drive-scroller">
            <div className="news-grid" />
          </div>
          <a className="drive-link" href="/news">Alle News →</a>
        </section>

        {/* TOUCHDOWN */}
        <section id="mitmachen" className="drive-panel drive-panel-end" data-from="0.86" data-to="1">
          <p className="drive-eyebrow">Touchdown · End Zone</p>
          <h2 className="drive-td">TOUCH<i>DOWN.</i></h2>
          <p className="drive-lead">
            Jetzt bist du dran. Du brauchst keine Erfahrung — nur den Willen, jede Woche
            wiederzukommen.
          </p>
          <div className="drive-actions">
            <a className="drive-cta" href="mailto:football@hsb1846.de">Probetraining anfragen</a>
            <a className="drive-link" href="/spielplan">Kompletter Spielplan →</a>
          </div>

          <nav className="drive-end-nav" aria-label="Weitere Seiten">
            <a href="/team">Team</a>
            <a href="/spielplan">Spielplan</a>
            <a href="/news">News</a>
            <a href="/galerie">Galerie</a>
            <a href="/ueber-uns">Über uns</a>
            <a href="/sponsoring">Sponsoring</a>
            <a href="/shop">Shop</a>
          </nav>
          <small className="drive-imprint">
            American Football · Eine Abteilung des Heidenheimer Sportbund 1846 e.V.
          </small>
        </section>
      </main>

      <DynamicHomeGames />
      <DynamicHomeFeeds />
    </div>
  );
}
