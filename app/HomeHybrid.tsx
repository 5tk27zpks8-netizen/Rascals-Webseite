import { Header } from "./SiteShell";
import { HybridDepth } from "./HybridDepth";
import { RascalsField } from "./RascalsField";
import { TeamUnits } from "./TeamUnits";
import { GamedayCountdown } from "./GamedayCountdown";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import "./home-hybrid.css";

/**
 * The Hybrid design: the calm structure, with depth.
 *
 * Sits deliberately between the other two dark designs. Arena spends a WebGL
 * context on atmosphere; this gets its dimensionality from layered planes and
 * a few degrees of tilt, which costs a couple of custom properties per frame
 * and works the same on a phone. Nothing here needs a GPU.
 */
export function HomeHybrid() {
  return (
    <div className="hy-page">
      <Header page="home" />
      <HybridDepth />

      <main>
        <section className="hy-hero">
          <div className="hy-grid-bg" aria-hidden="true" />

          <div className="hy-hero-inner">
            <div className="hy-hero-copy" data-depth="0.4">
              <span className="eyebrow red-text" data-reveal>American Football · Heidenheim</span>
              <h1 data-split-reveal><span>HART. ECHT.</span><br /><i>RASCALS.</i></h1>
              <p data-reveal data-reveal-delay="150">
                Ein Team. Eine Familie. Bereit für den nächsten Snap.
              </p>
              <div className="hy-actions" data-reveal data-reveal-delay="210">
                <a className="hy-cta" href="mailto:football@hsb1846.de">Teil des Teams werden</a>
                <a className="hy-ghost" href="/spielplan">Spielplan 2026</a>
              </div>
            </div>

            <div className="hy-stack" data-depth="1">
              <span className="hy-plate hy-plate-back" aria-hidden="true" />
              <span className="hy-plate hy-plate-mid" aria-hidden="true" />
              <div className="hy-photo">
                <img src="/helmet-hero-4k.webp" alt="Rascals Footballhelm im Flutlicht" />
              </div>
            </div>
          </div>
        </section>

        <section className="hy-gameday">
          <GamedayCountdown heading="NÄCHSTES SPIEL" kicker="GAME DAY" />
        </section>

        <section className="hy-stats">
          <article data-reveal data-depth="0.5"><b>2023</b><span>Gegründet</span></article>
          <article data-reveal data-reveal-delay="70" data-depth="0.5"><b data-count="11">11</b><span>Spieler auf dem Feld</span></article>
          <article data-reveal data-reveal-delay="140" data-depth="0.5"><b>1</b><span>Rascals Family</span></article>
          <article data-reveal data-reveal-delay="210" data-depth="0.5"><b data-count="100" data-count-suffix="%">100%</b><span>Heidenheim</span></article>
        </section>

        <section id="spielplan" className="section fixtures-section hy-fixtures">
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

        <section className="hy-club">
          <div className="hy-club-media" data-depth="0.8">
            <img src="/team-victory-4k.webp" alt="Die Hellenstein Rascals feiern gemeinsam" />
          </div>
          <div className="hy-club-copy">
            <span className="eyebrow red-text" data-reveal>Mehr als Football</span>
            <h2 data-reveal data-reveal-delay="80">EIN TEAM.<br /><i>EINE FAMILIE.</i></h2>
            <p data-reveal data-reveal-delay="150">
              Seit 2023 bringen wir American Football zurück unter den Hellenstein. Bei uns zählen
              Einsatz, Fairness und der Mensch unter dem Helm.
            </p>
            <a className="text-link" href="/ueber-uns" data-reveal data-reveal-delay="210">Unsere Geschichte <span>→</span></a>
          </div>
        </section>

        <section className="section news-preview hy-news">
          <div className="section-heading">
            <div>
              <span className="eyebrow red-text">Inside Rascals</span>
              <h2>FROM THE <i>HUDDLE.</i></h2>
            </div>
          </div>
          <div className="news-grid" />
        </section>

        <section className="hy-join" data-depth="0.3">
          <div className="hy-join-inner">
            <span className="eyebrow red-text" data-reveal>Your next play</span>
            <h2 data-reveal data-reveal-delay="90">READY TO JOIN<br /><i>THE FAMILY?</i></h2>
            <p data-reveal data-reveal-delay="150">Du brauchst keine Erfahrung. Nur den Willen, jede Woche wiederzukommen.</p>
            <a className="hy-cta" href="mailto:football@hsb1846.de" data-reveal data-reveal-delay="200">Probetraining anfragen</a>
          </div>
        </section>
      </main>

      <footer className="hy-footer">
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
