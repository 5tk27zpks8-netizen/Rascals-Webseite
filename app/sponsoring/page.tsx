import { listActiveSponsors, type PublicSponsor } from "../lib/sponsors";
import { wide } from "../lib/responsive-image";
import { Header } from "../SiteShell";
import "./sponsoring.css";
import { siteBrand } from "../lib/brand-server";

export const metadata = {
  title: "Sponsoring · Hellenstein Rascals",
  description: "Partner und Sponsoren der Hellenstein Rascals.",
};

/**
 * THE PERSON, NOT THE INBOX.
 *
 * A sponsoring page that ends at a shared address asks a business to write to
 * a club. Naming the person who answers asks them to write to somebody, which
 * is a different thing, and the picture is what makes it one.
 *
 * All three are here rather than in the CMS because that is the smaller
 * change: one line each to edit, no schema, no migration. Drop a photograph
 * into /public and put its file name in `photo` — until then the block shows
 * the club's mark in the frame the picture will fill, so the layout does not
 * move when it arrives. An empty `email` prints a plain note rather than a
 * dead link.
 */
const SPONSORSHIP_LEAD = {
  name: "Philipp Epple",
  role: "Sponsoring-Beauftragter",
  email: "",
  photo: "",
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

  const brand = await siteBrand();

  return (
    <>
    <Header page="sponsoring" brand={brand} />
    <main className="sponsors-page">
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
                        {sponsor.logo ? <img {...wide(sponsor.logo)} src={sponsor.logo} alt={`${sponsor.name} Logo`} /> : <div className="sponsor-placeholder">{sponsor.name}</div>}
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

        <section className="sponsor-lead">
          <div className="sponsor-lead-head">
            <small>DEIN ANSPRECHPARTNER</small>
            <h2>{SPONSORSHIP_LEAD.role}</h2>
          </div>
          <article className="sponsor-lead-card">
            <div className={SPONSORSHIP_LEAD.photo ? "sponsor-lead-photo" : "sponsor-lead-photo is-empty"}>
              {SPONSORSHIP_LEAD.photo ? (
                <img src={SPONSORSHIP_LEAD.photo} alt={SPONSORSHIP_LEAD.name} />
              ) : (
                <img src="/rascals-logo-768.webp" alt="" aria-hidden="true" />
              )}
            </div>
            <div className="sponsor-lead-body">
              {/* The role is the heading above; repeating it inside the card
                  only cost two lines on a phone. */}
              <b>{SPONSORSHIP_LEAD.name}</b>
              {SPONSORSHIP_LEAD.email ? (
                <a href={`mailto:${SPONSORSHIP_LEAD.email}?subject=Sponsoring%20Hellenstein%20Rascals`}>
                  {SPONSORSHIP_LEAD.email}
                </a>
              ) : (
                <span className="sponsor-lead-pending">E-Mail-Adresse folgt</span>
              )}
            </div>
          </article>
        </section>

        <section className="sponsors-cta">
          <div><h3>Teil des Rascals Netzwerks werden.</h3><p>Partnerschaften rund um Team, Gameday und regionale Sichtbarkeit.</p></div>
          <a href="mailto:football@hsb1846.de?subject=Sponsoring%20Hellenstein%20Rascals">Sponsoring anfragen →</a>
        </section>
      </section>
    </main>
    </>
  );
}
