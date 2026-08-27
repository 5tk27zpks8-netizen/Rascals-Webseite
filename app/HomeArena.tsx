import { ArenaDrive } from "./ArenaDrive";
import { MatchdayHero } from "./MatchdayHero";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import "./home-arena.css";

/**
 * ARENA — THE DRIVE.
 *
 * A onepager built as a possession rather than a page. Scrolling walks the
 * camera from the Rascals' own end zone to the opponent's; each panel arrives
 * at the yard marker it belongs to, and a broadcast overlay counts the drive
 * down alongside it. There is no header, no hero-then-sections stack, no
 * footer in the usual sense — the structure is the field.
 *
 * The navigation is the chain: the yard markers double as jump links, so the
 * one thing a visitor always has is a way to skip ahead.
 *
 * Everything is plain HTML in document order. Where the drive cannot run —
 * phones, coarse pointers, reduced motion — the panels simply stack and the
 * page reads top to bottom like any other.
 */

const drivePanels = [
  { id: "kickoff", yard: "OWN 20", label: "KICKOFF" },
  { id: "nextgame", yard: "OWN 35", label: "1ST & 10" },
  { id: "zahlen", yard: "50", label: "2ND & 6" },
  { id: "units", yard: "OPP 35", label: "3RD & 2" },
  { id: "spielplan", yard: "OPP 12", label: "4TH & GOAL" },
  { id: "mitmachen", yard: "END ZONE", label: "TOUCHDOWN" },
];

const units = [
  { name: "OFFENSE", line: "Ball. Yards. Punkte.", text: "Line, Backfield und Receiver — elf Spieler, ein Spielzug, kein Alleingang." },
  { name: "DEFENSE", line: "Stoppen. Zurückholen.", text: "Front, Linebacker und Secondary. Wer hier steht, gibt keinen Meter freiwillig her." },
  { name: "SPECIAL TEAMS", line: "Ein Snap entscheidet.", text: "Kick, Punt, Return. Die Phase, die Spiele dreht und die keiner trainiert sehen will." },
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
          <b data-hud-yard>20</b>
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
        <section id="kickoff" className="drive-panel drive-panel-open" data-from="0" data-to="0.13">
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
        <section id="nextgame" className="drive-panel" data-from="0.13" data-to="0.3">
          <p className="drive-eyebrow">1st &amp; 10 · Own 35</p>
          <div className="drive-fixture"><MatchdayHero /></div>
        </section>

        {/* 2ND & 6 — the club in numbers */}
        <section id="zahlen" className="drive-panel" data-from="0.3" data-to="0.47">
          <p className="drive-eyebrow">2nd &amp; 6 · Midfield</p>
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
        </section>

        {/* 3RD & 2 — the units */}
        <section id="units" className="drive-panel" data-from="0.47" data-to="0.66">
          <p className="drive-eyebrow">3rd &amp; 2 · Opp 35</p>
          <h2>DREI UNITS.<br /><i>EIN TEAM.</i></h2>
          <div className="drive-units">
            {units.map((unit, index) => (
              <article key={unit.name} style={{ "--i": index } as React.CSSProperties}>
                <span className="drive-unit-no">{String(index + 1).padStart(2, "0")}</span>
                <h3>{unit.name}</h3>
                <strong>{unit.line}</strong>
                <p>{unit.text}</p>
              </article>
            ))}
          </div>
          <a className="drive-link" href="/team">Zum kompletten Roster →</a>
        </section>

        {/* 4TH & GOAL — the schedule */}
        <section id="spielplan" className="drive-panel section fixtures-section drive-fixtures" data-from="0.66" data-to="0.87">
          <p className="drive-eyebrow">4th &amp; Goal · Opp 12</p>
          <div className="section-heading">
            <div><h2>NÄCHSTE <i>GAMES.</i></h2></div>
          </div>
          <div className="fixture-list" />
        </section>

        {/* TOUCHDOWN */}
        <section id="mitmachen" className="drive-panel drive-panel-end" data-from="0.87" data-to="1">
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
