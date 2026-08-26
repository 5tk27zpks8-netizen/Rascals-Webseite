"use client";

import { useEffect, useState } from "react";

export type PageName = "home" | "ueber-uns" | "team" | "sponsoring" | "shop" | "news" | "galerie" | "spielplan";

const nav = [
  ["Spielplan", "/spielplan"],
  ["Team", "/team"],
  ["Über uns", "/ueber-uns"],
  ["News", "/news"],
  ["Galerie", "/galerie"],
  ["Sponsoring", "/sponsoring"],
  ["Shop", "/shop"],
] as const;

const gallery = [
  { src: "/team-entry-4k.webp", alt: "Die Hellenstein Rascals laufen mit Teamfahnen auf das Feld" },
  { src: "/team-players-4k.webp", alt: "Spieler der Hellenstein Rascals vor dem Spiel" },
  { src: "/team-celebrate-4k.webp", alt: "Zwei Rascals Spieler feiern eine gelungene Aktion" },
  { src: "/team-huddle-4k.webp", alt: "Das Team der Hellenstein Rascals auf dem Spielfeld" },
  { src: "/team-walk-4k.webp", alt: "Rascals Spieler gehen gemeinsam über das Feld" },
  { src: "/helmet-hero-4k.webp", alt: "Rascals Footballhelm vor dem Team" },
];

const shopUrl = "https://hellenstein-rascals.myshopify.com";
const productUrl = `${shopUrl}/products/puli`;
const productImage = "/shop-product-4k.webp";

export function Header({ page }: { page: PageName }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Hellenstein Rascals Startseite">
        <img src="/rascals-logo-transparent-4k.png" alt="" />
        <span><strong>HELLENSTEIN</strong><em>RASCALS</em></span>
      </a>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="main-nav">
        <span /> <span /> <span />
        <b className="sr-only">Menü</b>
      </button>
      <nav id="main-nav" className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Hauptnavigation">
        {nav.map(([label, href]) => (
          <a key={href} href={href} className={page === href.slice(1) ? "active" : ""}>{label}</a>
        ))}
        <a className="nav-cta" href="mailto:football@hsb1846.de">Mitmachen</a>
      </nav>
    </header>
  );
}

function Hero() {
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % 2), 6500);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <section className="hero" aria-roledescription="Karussell" aria-label="Rascals Highlights">
      <div className={`hero-slide helmet-slide ${slide === 0 ? "visible" : ""}`} aria-hidden={slide !== 0}>
        <img src="/helmet-hero-4k.webp" alt="Rascals Footballhelm im Flutlicht" data-parallax="10" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="eyebrow">American Football · Heidenheim</span>
          <h1>HART. ECHT.<br /><i>RASCALS.</i></h1>
          <p>Ein Team. Eine Familie. Bereit für den nächsten Snap.</p>
          <div className="button-row">
            <a className="button red" href="mailto:football@hsb1846.de">Teil des Teams werden <span>→</span></a>
            <a className="button ghost" href="/spielplan">Spielplan 2026</a>
          </div>
        </div>
      </div>

      <div className={`hero-slide schedule-slide ${slide === 1 ? "visible" : ""}`} aria-hidden={slide !== 1}>
        <img src="/team-entry-4k.webp" alt="Hellenstein Rascals beim Einlauf" data-parallax="10" />
        <div className="hero-shade" />
        <div className="schedule-card">
          <span className="eyebrow">Kreisoberliga · Saison 2026</span>
          <h2>GAME<br /><i>SCHEDULE</i></h2>
          <div className="mini-fixtures" />
          <a href="/spielplan" className="text-link">Alle bestätigten Termine <span>→</span></a>
        </div>
      </div>

      <div className="hero-controls" aria-label="Motiv auswählen">
        {[0, 1].map((item) => (
          <button key={item} onClick={() => setSlide(item)} aria-label={`Motiv ${item + 1}`} className={slide === item ? "active" : ""} />
        ))}
        {/* WCAG 2.2.2: auto-advancing content longer than 5s needs a pause control. */}
        <button
          className="hero-playstate"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Automatischen Wechsel pausieren" : "Automatischen Wechsel fortsetzen"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
      </div>
    </section>
  );
}

function SponsorTicker() {
  const sponsors = [
    { src: "/sponsor-cap-4k.webp", alt: "CAP – Dein Supermarkt" },
    { src: "/sponsor-hsb-4k.webp", alt: "Heidenheimer Sportbund 1846" },
    { src: "/sponsor-grimmelsen-4k.webp", alt: "Sponsor by Grimmelsen" },
    { src: "/sponsor-appalachian-4k.webp", alt: "Appalachian Barbecue & Burger" },
    { src: "/sponsor-brauchle-4k.webp", alt: "Dr. med. dent. Gert Brauchle – Fachzahnarzt für Kieferorthopädie" },
  ];
  const tickerSponsors = Array.from({ length: 4 }, () => sponsors).flat();
  return (
    <section className="sponsor-strip" aria-label="Unsere Partner">
      <p>PROUDLY POWERED BY</p>
      <div className="ticker-window"><div className="ticker-track">
        {[0, 1].map((sequence) => (
          <div className="ticker-sequence" key={sequence} aria-hidden={sequence === 1}>
            {tickerSponsors.map((sponsor, index) => (
              <span key={`${sequence}-${sponsor.src}-${index}`} className="sponsor-logo"><img src={sponsor.src} alt={sequence === 0 && index < sponsors.length ? sponsor.alt : ""} /></span>
            ))}
          </div>
        ))}
      </div></div>
    </section>
  );
}

function Fixtures() {
  return (
    <section id="spielplan" className="section fixtures-section">
      <div className="section-heading">
        <div data-reveal><span className="eyebrow red-text">Saison 2026</span><h2>NÄCHSTE <i>GAMES.</i></h2></div>
        <p data-reveal data-reveal-delay="120">Bestätigte Begegnungen der Rascals in der Kreisoberliga.</p>
      </div>
      <div className="fixture-list" />
    </section>
  );
}

function ShopFeature({ full = false }: { full?: boolean }) {
  return (
    <section className={full ? "shop-feature page-shop" : "shop-feature"}>
      <div className="shop-copy"><span className="eyebrow" data-reveal>OFFICIAL TEAMWEAR</span><h2 data-reveal data-reveal-delay="80">WEAR THE<br /><i>RAS­CALS.</i></h2><p data-reveal data-reveal-delay="160">Zeig deine Farben – auf der Tribüne, im Training und überall dazwischen. Direkt im offiziellen RASCALS-SHOP bestellen.</p><a className="button light" href={shopUrl} target="_blank" rel="noreferrer" data-reveal data-reveal-delay="220">Zum Rascals Shop <span>↗</span></a></div>
      <div className="product-cards">
        <a href={productUrl} target="_blank" rel="noreferrer" className="product-card product-main" data-reveal><img src={productImage} alt="Puli aus dem offiziellen RASCALS-SHOP" /><div><strong>Puli</strong><span>25,00 €</span></div></a>
        <a href={productUrl} target="_blank" rel="noreferrer" className="product-card product-detail" data-reveal data-reveal-delay="100"><img src={productImage} alt="Detailansicht des Rascals Pulis" /><div><strong>Teamwear</strong><span>Shop ansehen</span></div></a>
        <a href={shopUrl} target="_blank" rel="noreferrer" className="product-card product-crop" data-reveal data-reveal-delay="180"><img src={productImage} alt="Rascals Merchandise Kollektion" /><div><strong>Rascals Gear</strong><span>Alle Artikel</span></div></a>
      </div>
    </section>
  );
}

function HomePage({ heroOverride }: { heroOverride?: React.ReactNode }) {
  return <>
    {heroOverride ?? <Hero />}

    <div className="stat-bar">
      <span data-reveal><b>2023</b>GEGRÜNDET</span>
      <span data-reveal data-reveal-delay="80"><b data-count="11">11</b>SPIELER AUF DEM FELD</span>
      <span data-reveal data-reveal-delay="160"><b>1</b>RAS&shy;CALS FAMILY</span>
      <span data-reveal data-reveal-delay="240"><b data-count="100" data-count-suffix="%">100%</b>HEIDENHEIM</span>
    </div>

    <Fixtures />
    <hr className="rascals-yardline" />

    <section className="story-split">
      <div className="story-image">
        <img src="/team-victory-4k.webp" alt="Hellenstein Rascals feiern gemeinsam nach ihrem Sieg" />
        <span data-reveal>NO ONE<br />FIGHTS ALONE.</span>
      </div>
      <div className="story-copy">
        <span className="eyebrow red-text" data-reveal>Mehr als Football</span>
        <h2 data-reveal data-reveal-delay="80">EIN TEAM.<br />EINE <i>FAMILIE.</i></h2>
        <p data-reveal data-reveal-delay="160">Seit 2023 bringen wir American Football zurück unter den Hellenstein. Bei uns zählen Einsatz, Fairness und der Mensch unter dem Helm.</p>
        <p data-reveal data-reveal-delay="200">Ob Rookie oder Veteran: Wer für das Team alles gibt, gehört dazu.</p>
        <a className="text-link dark-link" href="/ueber-uns" data-reveal data-reveal-delay="260">Unsere Geschichte <span>→</span></a>
      </div>
    </section>

    <ShopFeature />
    <hr className="rascals-yardline" />

    <section className="section news-preview">
      <div className="section-heading">
        <div data-reveal>
          <span className="eyebrow red-text">Inside Rascals</span>
          <h2>FROM THE <i>HUDDLE.</i></h2>
        </div>
        <a className="text-link dark-link" href="/news" data-reveal data-reveal-delay="120">Alle News <span>→</span></a>
      </div>
      <div className="news-grid">
        <article className="featured-news" data-reveal>
          <img src="/team-players-4k.webp" alt="Rascals Spieler vor dem Spiel" />
          <div><span>TEAM · 2026</span><h3>Aufstieg in die Kreisoberliga</h3><p>Das nächste Kapitel ist geschrieben: Die Rascals stellen sich einer neuen sportlichen Herausforderung.</p></div>
        </article>
        <article className="compact-news dkms-card" data-reveal data-reveal-delay="100">
          <img src="/dkms-action-4k.webp" alt="Rascals Spieler wirbt für die DKMS-Stammzellspende" />
          <div><span>GAMEDAY · 04.07.</span><h3>Football trifft Lebensretter</h3><p>Beim Heimspiel gegen Heilbronn wird der Gameday mit einer DKMS-Typisierungsaktion verbunden.</p><a href="/news">Story lesen →</a></div>
        </article>
        <article className="compact-news shop-card" data-reveal data-reveal-delay="180">
          <img src={productImage} alt="Puli aus dem offiziellen Rascals Fanshop" />
          <div><span>SHOP · ONLINE</span><h3>Offizieller RASCALS-SHOP jetzt live</h3><p>Rascals Teamwear ist ab sofort direkt über unseren RASCALS-SHOP erhältlich.</p><a href={shopUrl} target="_blank" rel="noreferrer">Shop öffnen ↗</a></div>
        </article>
      </div>
    </section>

    <SponsorTicker />
    <JoinCta />
  </>;
}

function PageHero({ kicker, title, italic, image, className = "", children }: { kicker: string; title: string; italic: string; image: string; className?: string; children: React.ReactNode }) {
  return <section className={`page-hero ${className}`.trim()}><img src={image} alt="" data-parallax="8" /><div className="hero-shade" /><div><span className="eyebrow" data-reveal>{kicker}</span><h1 data-reveal data-reveal-delay="80">{title}<br /><i>{italic}</i></h1><p data-reveal data-reveal-delay="180">{children}</p></div></section>;
}

function AboutPage() {
  return <><PageHero kicker="Unsere Geschichte" title="BORN UNDER" italic="HELLENSTEIN." image="/team-entry-4k.webp">Jung gegründet. Fest verwurzelt. Gemeinsam auf dem Weg nach oben.</PageHero><section className="section manifesto"><span className="big-number">24.05.23</span><div><span className="eyebrow red-text">Der erste Snap</span><h2>FOOTBALL IST<br /><i>TEAMARBEIT.</i></h2><p>Am 24. Mai 2023 wurde die American-Football-Abteilung des Heidenheimer Sportbunds gegründet. Das Ziel: sportlichen Ehrgeiz, Spaß und familiäre Identität zusammenbringen.</p><p>Unser Logo verbindet den Heidenheimer Heidekopf mit dem Footballhelm. Unsere Farben Blau, Rot und Weiß stehen für Heimat, Energie und Zusammenhalt.</p></div></section><section className="values"><article data-reveal><b>01</b><h3>TEAMGEIST</h3><p>Wir gewinnen zusammen, wir lernen zusammen.</p></article><article data-reveal data-reveal-delay="90"><b>02</b><h3>FAIRNESS</h3><p>Respekt gilt auf und neben dem Feld.</p></article><article data-reveal data-reveal-delay="180"><b>03</b><h3>ENTWICKLUNG</h3><p>Jeder Rep bringt uns als Team weiter.</p></article><article data-reveal data-reveal-delay="270"><b>04</b><h3>HEIMAT</h3><p>Heidenheim ist in unserem Namen und Herzen.</p></article></section><JoinCta /></>;
}

function TeamPage() {
  return <><PageHero kicker="Roster & Coaches" title="ONE TEAM." italic="ALL IN." image="/team-juniors-new-4k.webp">Auf dem Feld zählt nicht, wo du angefangen hast – sondern was du für das Team gibst.</PageHero><section className="section team-intro"><div className="section-heading"><div><span className="eyebrow red-text">Rascals Family</span><h2>DEIN PLATZ<br /><i>IM TEAM.</i></h2></div><p>Bei den Rascals finden unterschiedliche Stärken ihre Position. Football-Erfahrung ist für den Einstieg nicht nötig; Motivation und Verlässlichkeit schon.</p></div><div className="team-panels"><article data-reveal><img src="/team-walk-4k.webp" alt="Spieler der Rascals gehen aufs Feld" /><div><span>SENIORS · AB 18</span><h3>TACKLE FOOTBALL</h3><p>Wettkampf, Technik und Athletik – mit einem Team, das dich fordert und trägt.</p></div></article><article data-reveal data-reveal-delay="120"><img src="/team-juniors-new-4k.webp" alt="Hellenstein Rascals gemeinsam auf dem Spielfeld" /><div><span>JUNIORS · 14–18</span><h3>NEXT GENERATION</h3><p>Grundlagen sicher lernen, Verantwortung übernehmen und als Spieler wachsen.</p></div></article></div></section><section className="training-band"><div><span className="eyebrow">Training</span><h2>READY TO<br /><i>SUIT UP?</i></h2></div><div className="training-details"><p><b>Montag & Donnerstag</b><span>Außentraining · Heeracker 22</span></p><p><b>Aktuelle Zeiten</b><span>Bitte vorab über Instagram bestätigen</span></p><a className="button light" href="mailto:football@hsb1846.de">Probetraining anfragen →</a></div></section></>;
}

function SponsoringPage() {
  return <><PageHero kicker="Partner der Rascals" title="YOUR BRAND." italic="OUR DRIVE." image="/sponsoring-team-photo-4k.webp">Werde Teil unserer Entwicklung und bring deine Marke mitten in die regionale Football-Community.</PageHero><section className="section sponsor-content"><div className="section-heading"><div><span className="eyebrow red-text">Gemeinsam wachsen</span><h2>PARTNERSHIP<br /><i>WITH IMPACT.</i></h2></div><p>Vom Gameday bis zu Social Media: Wir schnüren ein Paket, das zu deinen Zielen und zu unserer Rascals Family passt.</p></div><div className="package-grid"><article data-reveal><b>01</b><h3>GAMEDAY</h3><p>Präsenz am Spielfeld, Durchsagen und Aktivierungen direkt bei unseren Fans.</p></article><article data-reveal data-reveal-delay="100"><b>02</b><h3>TEAMWEAR</h3><p>Sichtbarkeit auf Ausrüstung und Bekleidung – nah am Team, auf jedem Foto.</p></article><article data-reveal data-reveal-delay="200"><b>03</b><h3>DIGITAL</h3><p>Gemeinsame Geschichten, Social Content und Reichweite über die Saison.</p></article></div><div className="sponsor-contact"><div><span className="eyebrow">Let’s team up</span><h2>BEREIT FÜR<br />DEN <i>KICKOFF?</i></h2></div><a className="button red" href="mailto:football@hsb1846.de?subject=Sponsoring%20Hellenstein%20Rascals">Sponsoring anfragen →</a></div></section><SponsorTicker /></>;
}

function NewsPage() {
  return <><PageHero kicker="Latest Stories" title="FROM THE" italic="SIDELINE." image="/team-walk-4k.webp">News, Gamedays und Geschichten aus der Rascals Family.</PageHero><section className="section full-news"><article><img src="/team-players-4k.webp" alt="Rascals Spieler" /><div><span>SAISON · 2026</span><h2>Rascals starten in der Kreisoberliga</h2><p>Nach dem Aufstieg wartet die nächste sportliche Stufe. In der Kreisoberliga treffen die Rascals unter anderem auf Filderstadt, Heilbronn, Mannheim und die Neckar Hammers.</p><a href="https://www.hz.de/sport/mehr/sportliches-adventsgeschenk-die-hellenstein-rascals-steigen-mit-verspaetung-in-die-kreisoberliga-auf" target="_blank" rel="noreferrer">Mehr erfahren ↗</a></div></article><article><img className="dkms-news-image" src="/dkms-action-4k.webp" alt="Stäbchen rein, Spender sein – DKMS-Aktion der Hellenstein Rascals" /><div><span>COMMUNITY · 04.07.2026</span><h2>Gameday mit DKMS-Aktion</h2><p>Sportlich wichtig, menschlich noch größer: Rund um das Heimspiel gegen die Heilbronn Salt Miners findet eine Typisierungsaktion statt.</p><a href="https://www.hz.de/sport/mehr/vom-stammzellspender-zum-botschafter-wie-offensivtrainer-jonas-mueller-das-topspiel-der-rascals-zu-einem-doppelten-erfolg-machen-will" target="_blank" rel="noreferrer">Zur Story ↗</a></div></article><article><img src={productImage} alt="Rascals Fanshop Produkt" /><div><span>SHOP · ONLINE</span><h2>Offizieller RASCALS-SHOP</h2><p>Teamwear und Fanartikel im Rascals Look: Der offizielle RASCALS-SHOP ist direkt erreichbar.</p><a href={shopUrl} target="_blank" rel="noreferrer">Jetzt shoppen ↗</a></div></article></section></>;
}

function GalleryPage() {
  const [selected, setSelected] = useState<(typeof gallery)[number] | null>(null);
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  return <><PageHero kicker="Game Faces" title="UNDER THE" italic="LIGHTS." image="/helmet-hero-4k.webp">Momente, die bleiben – vom Tunnel bis zum letzten Whistle.</PageHero><section className="section gallery-section"><div className="section-heading"><div><span className="eyebrow red-text">Rascals in action</span><h2>GALLERY<br /><i>2026.</i></h2></div><p>Ein Blick hinter das Visier: Team, Emotionen und Football in Heidenheim.</p></div><div className="gallery-grid">{gallery.map((photo, index) => <button key={photo.src} onClick={() => setSelected(photo)} aria-label={`Bild ${index + 1} groß anzeigen`}><img src={photo.src} alt={photo.alt} /><span>VIEW · 0{index + 1}</span></button>)}</div></section>{selected && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Großansicht"><button onClick={() => setSelected(null)} aria-label="Großansicht schließen">×</button><img src={selected.src} alt={selected.alt} /></div>}</>;
}

function JoinCta() {
  return <section className="join-cta"><img src="/team-entry-4k.webp" alt="" data-parallax="8" /><div className="hero-shade" /><div><span className="eyebrow" data-reveal>YOUR NEXT PLAY</span><h2 data-reveal data-reveal-delay="80">READY TO JOIN<br />THE <i>FAMILY?</i></h2><p data-reveal data-reveal-delay="160">Du brauchst keine Erfahrung. Nur den Willen, Teil von etwas Größerem zu werden.</p><a className="button red" href="mailto:football@hsb1846.de" data-reveal data-reveal-delay="220">Probetraining anfragen <span>→</span></a></div></section>;
}

function Footer() {
  return <footer><div className="footer-brand"><img src="/rascals-logo-transparent-4k.png" alt="Hellenstein Rascals" /><p>American Football in Heidenheim.<br />Eine Abteilung des Heidenheimer Sportbund 1846 e.V.</p></div><div><b>EXPLORE</b>{nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}</div><div><b>FOLLOW</b><a href="https://www.instagram.com/hellenstein_rascals/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://www.facebook.com/HellensteinRascals/" target="_blank" rel="noreferrer">Facebook ↗</a><a href="mailto:football@hsb1846.de">E-Mail ↗</a></div><div><b>HOME FIELD</b><p>Heeracker 22<br />89522 Heidenheim</p></div><small>© 2026 HELLENSTEIN RASCALS · ALL GRIT. ALL HEART.</small></footer>;
}

/**
 * `heroOverride` lets the homepage swap in the CMS-driven hero while keeping
 * it inside <main>, below the header. Rendering it as a sibling before
 * <SiteShell> pushed the sticky header underneath the hero.
 */
export function SiteShell({ page, heroOverride }: { page: PageName; heroOverride?: React.ReactNode }) {
  let content: React.ReactNode;
  if (page === "ueber-uns") content = <AboutPage />;
  else if (page === "team") content = <TeamPage />;
  else if (page === "sponsoring") content = <SponsoringPage />;
  else if (page === "shop") content = <><PageHero kicker="Official Teamwear" title="WEAR THE" italic="RASCALS." image="/team-players-4k.webp" className="shop-page-hero">Deine Farben. Dein Team. Direkt aus unserem RASCALS-SHOP.</PageHero><ShopFeature full /></>;
  else if (page === "news") content = <NewsPage />;
  else if (page === "galerie") content = <GalleryPage />;
  else content = <HomePage heroOverride={heroOverride} />;
  return <><a className="skip-link" href="#content">Zum Inhalt</a><Header page={page} /><main id="content">{content}</main><Footer /></>;
}
