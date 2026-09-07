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
 *
 * Panels are built as broadcast graphics, not slides. A stop that makes a
 * statement runs full-bleed with the ground open beside it; a stop that
 * carries a list splits into a title rail and a content column, so a fixture
 * list and a news grid are laid out rather than stacked. Every element inside
 * a panel is marked with `data-cue`, which is what the stylesheet staggers —
 * content arrives in reading order instead of the whole panel appearing at
 * once.
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

const figures = [
  { value: "2023", label: "Gegründet" },
  { value: "11", label: "Spieler auf dem Feld" },
  { value: "1", label: "Rascals Family" },
  { value: "100%", label: "Heidenheim" },
];

export function HomeArena() {
  return (
    <div className="drive-page">
      <ArenaDrive />
      <div className="drive-vignette" aria-hidden="true" />

      {/* --- broadcast overlay ------------------------------------- */}
      <header className="drive-hud">
        <a className="drive-hud-brand" href="/">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span>HELLENSTEIN<br /><i>RASCALS</i></span>
        </a>

        <div className="drive-hud-centre">
          <span className="drive-hud-down" data-hud-down>KICKOFF</span>
          <div className="drive-hud-bar" data-hud-bar>
            <i />
            <u />
          </div>
          <span className="drive-hud-caption" data-hud-caption>Der Drive läuft</span>
        </div>

        <div className="drive-hud-yard">
          <small>Ball on</small>
          <b data-hud-yard>OWN 20</b>
        </div>
      </header>

      {/* --- the chain: navigation as yard markers ------------------ */}
      <nav className="drive-chain" aria-label="Abschnitte">
        {drivePanels.map((panel) => (
          <a key={panel.id} href={`#${panel.id}`} data-chain={panel.id}>
            <span>{panel.yard}</span>
            <small>{panel.label}</small>
          </a>
        ))}
      </nav>

      <main className="drive-track">
        {/* KICKOFF */}
        <section id="kickoff" className="drive-panel drive-panel-open" data-from="0" data-to="0.11">
          <p className="drive-eyebrow" data-cue>Kickoff · Own 20</p>
          <h1 data-cue>
            <span>DIESE</span>
            <span>YARDS</span>
            <i>GEHÖREN UNS.</i>
          </h1>
          <p className="drive-lead" data-cue>
            Hellenstein Rascals — American Football in Heidenheim. Scroll dich mit uns
            über das Feld, von der eigenen 20 bis in die Endzone.
          </p>
          <span className="drive-hint" data-cue>Scrollen startet den Drive</span>
        </section>

        {/* 1ST & 10 — next game */}
        <section id="nextgame" className="drive-panel" data-from="0.11" data-to="0.24">
          <p className="drive-eyebrow" data-cue>1st &amp; 10 · Own 29</p>
          <div className="drive-fixture" data-cue><MatchdayHero /></div>
        </section>

        {/* 2ND & 6 — the club in numbers */}
        <section id="zahlen" className="drive-panel" data-from="0.24" data-to="0.37">
          <p className="drive-eyebrow" data-cue>2nd &amp; 6 · Own 39</p>
          <h2 data-cue>DER VEREIN<br /><i>IN ZAHLEN.</i></h2>
          <div className="drive-numbers">
            {figures.map((figure) => (
              <article key={figure.label} data-cue>
                <b>{figure.value}</b>
                <span>{figure.label}</span>
              </article>
            ))}
          </div>
          <p className="drive-lead" data-cue>
            Seit 2023 zurück unter dem Hellenstein. Bei uns zählen Einsatz, Fairness und
            der Mensch unter dem Helm.
          </p>
          <a className="drive-link" href="/ueber-uns" data-cue>Die ganze Vereinsgeschichte</a>
        </section>

        {/* 1ST & 10 at midfield — the teams */}
        <section id="team" className="drive-panel is-wide" data-from="0.37" data-to="0.53">
          <div className="drive-rail">
            <p className="drive-eyebrow" data-cue>1st &amp; 10 · Midfield</p>
            <h2 data-cue>DREI UNITS.<br /><i>EIN TEAM.</i></h2>
            <p className="drive-rail-note" data-cue>
              Offense, Defense, Special Teams — und zwei Mannschaften, in denen jeder
              seinen Platz findet.
            </p>
            <a className="drive-link" href="/team" data-cue>Zum kompletten Roster</a>
          </div>

          <div className="drive-body">
            <div className="drive-units">
              {units.map((unit, index) => (
                <article key={unit.name} data-cue>
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
                <article key={squad.name} data-cue>
                  <img src={squad.image} alt="" loading="lazy" />
                  <div>
                    <small>{squad.tag}</small>
                    <h3>{squad.name}</h3>
                    <p>{squad.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 2ND & 7 — the schedule */}
        <section id="spielplan" className="drive-panel is-wide section fixtures-section drive-fixtures" data-from="0.53" data-to="0.7">
          <div className="drive-rail">
            <p className="drive-eyebrow" data-cue>2nd &amp; 7 · Opp 38</p>
            <h2 data-cue>NÄCHSTE<br /><i>GAMES.</i></h2>
            <div className="section-heading" data-cue />
          </div>

          <div className="drive-body">
            <div className="drive-scroller" data-cue>
              <div className="fixture-list" />
            </div>
          </div>
        </section>

        {/* 1ST & 10 — the news */}
        <section id="news" className="drive-panel is-wide news-preview drive-news" data-from="0.7" data-to="0.86">
          <div className="drive-rail">
            <p className="drive-eyebrow" data-cue>1st &amp; 10 · Opp 24</p>
            <h2 data-cue>AUS DEM<br /><i>HUDDLE.</i></h2>
            <p className="drive-rail-note" data-cue>
              Spielberichte, Termine und alles, was zwischen zwei Kickoffs passiert.
            </p>
            <a className="drive-link" href="/news" data-cue>Alle News</a>
          </div>

          <div className="drive-body">
            <div className="drive-scroller" data-cue>
              <div className="news-grid" />
            </div>
          </div>
        </section>

        {/* TOUCHDOWN */}
        <section id="mitmachen" className="drive-panel drive-panel-end" data-from="0.86" data-to="1">
          <p className="drive-eyebrow" data-cue>Touchdown · End Zone</p>
          <h2 className="drive-td" data-cue>TOUCH<i>DOWN.</i></h2>
          <p className="drive-lead" data-cue>
            Jetzt bist du dran. Du brauchst keine Erfahrung — nur den Willen, jede Woche
            wiederzukommen.
          </p>
          <div className="drive-actions" data-cue>
            <a className="drive-cta" href="mailto:football@hsb1846.de">Probetraining anfragen</a>
            <a className="drive-link" href="/spielplan">Kompletter Spielplan</a>
          </div>

          <nav className="drive-end-nav" aria-label="Weitere Seiten" data-cue>
            <a href="/team">Team</a>
            <a href="/spielplan">Spielplan</a>
            <a href="/news">News</a>
            <a href="/galerie">Galerie</a>
            <a href="/ueber-uns">Über uns</a>
            <a href="/sponsoring">Sponsoring</a>
            <a href="/shop">Shop</a>
          </nav>
          <small className="drive-imprint" data-cue>
            American Football · Eine Abteilung des Heidenheimer Sportbund 1846 e.V.
          </small>
        </section>
      </main>

      <DynamicHomeGames />
      <DynamicHomeFeeds />
    </div>
  );
}
