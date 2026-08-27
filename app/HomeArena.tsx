import { Header } from "./SiteShell";
import { ArenaScene } from "./ArenaScene";
import { RascalsField } from "./RascalsField";
import { TeamUnits } from "./TeamUnits";
import { GamedayCountdown } from "./GamedayCountdown";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import "./home-arena.css";

/**
 * The Arena design: the club at night, under floodlights, with real depth.
 *
 * The opener is a WebGL field the visitor stands on; everything above it is
 * ordinary HTML, so the type stays sharp and the page still works when the
 * scene does not run. Below the opener the page stays disciplined — the 3D is
 * an entrance, not a costume worn through the whole site.
 */
export function HomeArena() {
  return (
    <div className="arena-page">
      <Header page="home" />

      <main>
        <section className="arena-hero">
          <ArenaScene />
          <div className="arena-hero-veil" />

          <div className="arena-hero-copy">
            <span className="arena-kicker" data-reveal>
              <i />American Football · Heidenheim
            </span>
            <h1 data-split-reveal>
              <span>UNTER FLUT</span>
              <br />
              <i>LICHT.</i>
            </h1>
            <p data-reveal data-reveal-delay="160">
              Hellenstein Rascals. Seit 2023 zurück unter dem Hellenstein — und jeden Snap bereit,
              den nächsten Meter zu holen.
            </p>
            <div className="arena-actions" data-reveal data-reveal-delay="220">
              <a className="arena-cta" href="mailto:football@hsb1846.de">Teil des Teams werden</a>
              <a className="arena-ghost" href="/spielplan">Spielplan 2026</a>
            </div>
          </div>

          <div className="arena-scroll" aria-hidden="true"><span /></div>
        </section>

        <section className="arena-gameday">
          <GamedayCountdown heading="NÄCHSTES SPIEL" kicker="GAME DAY" />
        </section>

        <section className="arena-stats">
          <article data-reveal><b>2023</b><span>Gegründet</span></article>
          <article data-reveal data-reveal-delay="70"><b data-count="11">11</b><span>Spieler auf dem Feld</span></article>
          <article data-reveal data-reveal-delay="140"><b>1</b><span>Rascals Family</span></article>
          <article data-reveal data-reveal-delay="210"><b data-count="100" data-count-suffix="%">100%</b><span>Heidenheim</span></article>
        </section>

        <section id="spielplan" className="section fixtures-section arena-fixtures">
          <RascalsField />
          <div className="section-heading">
            <div>
              <span className="eyebrow red-text">Saison 2026</span>
              <h2>NÄCHSTE <i>GAMES.</i></h2>
            </div>
            <p>Bestätigte Begegnungen der Rascals.</p>
          </div>
          <div className="fixture-list" />
        </section>

        <TeamUnits />

        <section className="arena-club">
          <div className="arena-club-copy">
            <span className="eyebrow red-text" data-reveal>Mehr als Football</span>
            <h2 data-reveal data-reveal-delay="80">EIN TEAM.<br /><i>EINE FAMILIE.</i></h2>
            <p data-reveal data-reveal-delay="150">
              Bei uns zählen Einsatz, Fairness und der Mensch unter dem Helm. Ob Rookie oder Veteran:
              Wer für das Team alles gibt, gehört dazu.
            </p>
            <a className="text-link" href="/ueber-uns" data-reveal data-reveal-delay="210">Unsere Geschichte <span>→</span></a>
          </div>
          <div className="arena-club-media" data-reveal data-reveal-delay="120">
            <img src="/team-victory-4k.webp" alt="Die Hellenstein Rascals feiern gemeinsam" />
          </div>
        </section>

        <section className="section news-preview arena-news">
          <div className="section-heading">
            <div>
              <span className="eyebrow red-text">Inside Rascals</span>
              <h2>FROM THE <i>HUDDLE.</i></h2>
            </div>
          </div>
          <div className="news-grid" />
        </section>

        <section className="arena-join">
          <img className="arena-join-image" src="/team-celebrate-4k.webp" alt="" />
          <div className="arena-join-veil" />
          <div className="arena-join-copy">
            <span className="eyebrow red-text" data-reveal>Your next play</span>
            <h2 data-split-reveal><span>READY TO JOIN</span><br /><i>THE FAMILY?</i></h2>
            <p data-reveal data-reveal-delay="140">Du brauchst keine Erfahrung. Nur den Willen, jede Woche wiederzukommen.</p>
            <a className="arena-cta" href="mailto:football@hsb1846.de" data-reveal data-reveal-delay="200">Probetraining anfragen</a>
          </div>
        </section>
      </main>

      <footer className="arena-footer">
        <div>
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <div>
            <strong>HELLENSTEIN RASCALS</strong>
            <small>American Football · Eine Abteilung des Heidenheimer Sportbund 1846 e.V.</small>
          </div>
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
