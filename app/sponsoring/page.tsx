import { listActiveSponsors, type PublicSponsor } from "../lib/sponsors";
import "./sponsoring.css";

export const metadata = {
  title: "Sponsoring · Hellenstein Rascals",
  description: "Partner und Sponsoren der Hellenstein Rascals.",
};

const tierLabels: Record<PublicSponsor["tier"], string> = {
  premium: "Premium Partner",
  gold: "Gold Partner",
  silver: "Silver Partner",
  partner: "Partner",
};

export default async function SponsoringPage() {
  const sponsors = await listActiveSponsors();
  const tiers: PublicSponsor["tier"][] = ["premium", "gold", "silver", "partner"];

  return (
    <main className="sponsors-page">
      <header className="sponsors-header">
        <a className="sponsors-brand" href="/">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span><strong>HELLENSTEIN</strong><em>RASCALS</em></span>
        </a>
        <nav className="sponsors-nav" aria-label="Hauptnavigation">
          <a href="/ueber-uns">ÜBER UNS</a>
          <a href="/team">TEAM</a>
          <a href="/sponsoring">SPONSORING</a>
          <a href="/shop">SHOP</a>
          <a href="/news">NEWS</a>
          <a href="/galerie">GALERIE</a>
        </nav>
      </header>

      <section className="sponsors-hero">
        <span>PROUDLY POWERED BY</span>
        <h1>PARTNER OF THE <i>HUDDLE.</i></h1>
        <p>Unsere Partner machen Training, Gamedays und die Entwicklung des American Football in Heidenheim möglich.</p>
      </section>

      <section className="sponsors-content">
        {tiers.map((tier) => {
          const items = sponsors.filter((sponsor) => sponsor.tier === tier);
          if (!items.length) return null;
          return (
            <section className="sponsor-tier" key={tier}>
              <div className="sponsor-tier-head">
                <div><small>RASCALS NETWORK</small><h2>{tierLabels[tier]}</h2></div>
                <small>{items.length} {items.length === 1 ? "PARTNER" : "PARTNER"}</small>
              </div>
              <div className="sponsor-grid">
                {items.map((sponsor) => {
                  const card = (
                    <>
                      <div className="sponsor-logo-box">
                        {sponsor.logo ? <img src={sponsor.logo} alt={`${sponsor.name} Logo`} /> : <div className="sponsor-placeholder">{sponsor.name}</div>}
                      </div>
                      <footer><span>{sponsor.name}</span><b>{sponsor.url ? "↗" : ""}</b></footer>
                    </>
                  );
                  return sponsor.url ? (
                    <a className="sponsor-card" href={sponsor.url} target="_blank" rel="noreferrer" key={sponsor.id}>{card}</a>
                  ) : (
                    <article className="sponsor-card" key={sponsor.id}>{card}</article>
                  );
                })}
              </div>
            </section>
          );
        })}

        {!sponsors.length && <div className="sponsors-empty">Aktive Sponsoren erscheinen hier automatisch, sobald sie im CMS angelegt wurden.</div>}

        <section className="sponsors-cta">
          <div><h3>Teil des Rascals Netzwerks werden.</h3><p>Partnerschaften rund um Team, Gameday und regionale Sichtbarkeit.</p></div>
          <a href="mailto:football@hsb1846.de?subject=Sponsoring%20Hellenstein%20Rascals">Sponsoring anfragen →</a>
        </section>
      </section>
    </main>
  );
}
