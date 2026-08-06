"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import "./admin.css";

type HeroSlide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
};

type AdminState = {
  slides: HeroSlide[];
  intervalSeconds: number;
  transition: "fade" | "slide";
  shopUrl: string;
};

const STORAGE_KEY = "rascals-admin-phase-1";

const defaultState: AdminState = {
  intervalSeconds: 7,
  transition: "fade",
  shopUrl: "https://hellenstein-rascals.myshopify.com",
  slides: [
    {
      id: "helmet",
      image: "/helmet-hero-4k.webp",
      eyebrow: "American Football · Heidenheim",
      title: "HART. ECHT.",
      accent: "RASCALS.",
      text: "Ein Team. Eine Familie. Bereit für den nächsten Snap.",
      buttonLabel: "Teil des Teams werden",
      buttonUrl: "mailto:football@hsb1846.de",
    },
    {
      id: "schedule",
      image: "/team-entry-4k.webp",
      eyebrow: "Kreisoberliga · Saison 2026",
      title: "GAME",
      accent: "SCHEDULE",
      text: "Alle bestätigten Termine, Gegner und Heimspiele auf einen Blick.",
      buttonLabel: "Zum Spielplan",
      buttonUrl: "/#spielplan",
    },
  ],
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AdminDashboard() {
  const [state, setState] = useState<AdminState>(defaultState);
  const [activeSection, setActiveSection] = useState<"dashboard" | "homepage" | "media" | "settings">("dashboard");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setState(JSON.parse(stored) as AdminState);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const mediaCount = useMemo(() => new Set(state.slides.map((slide) => slide.image)).size, [state.slides]);

  function save() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  function updateSlide(id: string, patch: Partial<HeroSlide>) {
    setState((current) => ({
      ...current,
      slides: current.slides.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)),
    }));
  }

  function addSlide() {
    const slide: HeroSlide = {
      id: uid(),
      image: "/team-huddle-4k.webp",
      eyebrow: "Rascals Highlight",
      title: "NEUER",
      accent: "SLIDE.",
      text: "Passe Bild, Text und Button direkt hier an.",
      buttonLabel: "Mehr erfahren",
      buttonUrl: "/",
    };
    setState((current) => ({ ...current, slides: [...current.slides, slide] }));
    setActiveSection("homepage");
  }

  function removeSlide(id: string) {
    setState((current) => ({ ...current, slides: current.slides.filter((slide) => slide.id !== id) }));
  }

  function moveSlide(index: number, direction: -1 | 1) {
    setState((current) => {
      const next = [...current.slides];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, slides: next };
    });
  }

  function uploadImage(id: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSlide(id, { image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Zur Website">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span><b>RASCALS</b><small>CONTENT CONTROL</small></span>
        </a>
        <nav>
          <button className={activeSection === "dashboard" ? "active" : ""} onClick={() => setActiveSection("dashboard")}><span>⌂</span>Dashboard</button>
          <p>WEBSITE</p>
          <button className={activeSection === "homepage" ? "active" : ""} onClick={() => setActiveSection("homepage")}><span>▣</span>Startseite</button>
          <button className={activeSection === "media" ? "active" : ""} onClick={() => setActiveSection("media")}><span>◫</span>Medien</button>
          <button disabled><span>◆</span>News <em>Phase 2</em></button>
          <button disabled><span>◇</span>Sponsoren <em>Phase 2</em></button>
          <p>SYSTEM</p>
          <button className={activeSection === "settings" ? "active" : ""} onClick={() => setActiveSection("settings")}><span>⚙</span>Einstellungen</button>
        </nav>
        <div className="admin-user"><span>CG</span><div><b>Christopher</b><small>Administrator</small></div></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><small>RASCALS CMS · PHASE 1</small><h1>{activeSection === "dashboard" ? "Dashboard" : activeSection === "homepage" ? "Startseite bearbeiten" : activeSection === "media" ? "Medienübersicht" : "Einstellungen"}</h1></div>
          <div className="admin-actions"><a href="/" target="_blank">Website öffnen ↗</a><button onClick={save}>{saved ? "Gespeichert ✓" : "Änderungen speichern"}</button></div>
        </header>

        {activeSection === "dashboard" && (
          <section className="admin-content">
            <div className="status-banner"><div><span className="status-dot" />Website online</div><p>Die Live-Website läuft unverändert. Änderungen in diesem Admin-Prototyp werden aktuell lokal in deinem Browser gespeichert.</p></div>
            <div className="metric-grid">
              <article><small>HERO-SLIDES</small><strong>{state.slides.length}</strong><button onClick={() => setActiveSection("homepage")}>Bearbeiten →</button></article>
              <article><small>MEDIEN IN VERWENDUNG</small><strong>{mediaCount}</strong><button onClick={() => setActiveSection("media")}>Ansehen →</button></article>
              <article><small>SHOP-ANBINDUNG</small><strong>AKTIV</strong><button onClick={() => setActiveSection("settings")}>Konfigurieren →</button></article>
              <article><small>NÄCHSTER AUSBAU</small><strong>NEWS</strong><span>Phase 2</span></article>
            </div>
            <div className="panel-grid">
              <article className="admin-panel"><div className="panel-heading"><div><small>SCHNELLAKTIONEN</small><h2>Was möchtest du ändern?</h2></div></div><div className="quick-grid"><button onClick={addSlide}><b>＋</b><span>Hero-Slide hinzufügen<small>Neues Bild, Texte und Button</small></span></button><button onClick={() => setActiveSection("homepage")}><b>✎</b><span>Startseite bearbeiten<small>Slider und Inhalte anpassen</small></span></button><button onClick={() => setActiveSection("media")}><b>▧</b><span>Bilder prüfen<small>Vorschau aller Hero-Medien</small></span></button></div></article>
              <article className="admin-panel preview-panel"><div className="panel-heading"><div><small>LIVE-VORSCHAU</small><h2>Aktueller Hero</h2></div></div><HeroPreview slide={state.slides[0]} /></article>
            </div>
          </section>
        )}

        {activeSection === "homepage" && (
          <section className="admin-content">
            <div className="editor-toolbar"><div><small>STARTSEITE</small><h2>Hero-Slider</h2><p>Bilder, Texte, Buttons und Reihenfolge bearbeiten.</p></div><button onClick={addSlide}>＋ Slide hinzufügen</button></div>
            <div className="slider-settings admin-panel"><label>Wechselintervall<select value={state.intervalSeconds} onChange={(e) => setState({ ...state, intervalSeconds: Number(e.target.value) })}><option value={4}>4 Sekunden</option><option value={7}>7 Sekunden</option><option value={10}>10 Sekunden</option></select></label><label>Übergang<select value={state.transition} onChange={(e) => setState({ ...state, transition: e.target.value as AdminState["transition"] })}><option value="fade">Sanftes Einblenden</option><option value="slide">Seitlicher Wechsel</option></select></label></div>
            <div className="slide-list">{state.slides.map((slide, index) => <SlideEditor key={slide.id} slide={slide} index={index} total={state.slides.length} update={updateSlide} remove={removeSlide} move={moveSlide} upload={uploadImage} />)}</div>
          </section>
        )}

        {activeSection === "media" && (
          <section className="admin-content">
            <div className="editor-toolbar"><div><small>MEDIEN</small><h2>Bildübersicht</h2><p>Diese Dateien werden aktuell im Hero-Slider verwendet.</p></div></div>
            <div className="media-grid">{state.slides.map((slide, index) => <article key={slide.id}><img src={slide.image} alt="" /><div><small>HERO · SLIDE {index + 1}</small><b>{slide.title} {slide.accent}</b><button onClick={() => setActiveSection("homepage")}>Bild ersetzen →</button></div></article>)}</div>
          </section>
        )}

        {activeSection === "settings" && (
          <section className="admin-content narrow-content">
            <article className="admin-panel settings-panel"><small>SHOPIFY</small><h2>Shop-Anbindung</h2><p>Der Shop bleibt separat. Dieser Link wird für alle Shop-Buttons verwendet.</p><label>Shop-URL<input value={state.shopUrl} onChange={(e) => setState({ ...state, shopUrl: e.target.value })} /></label></article>
            <article className="admin-panel settings-panel"><small>SPEICHERSTATUS</small><h2>Phase-1-Prototyp</h2><p>Die Einstellungen werden zunächst ausschließlich in diesem Browser gespeichert. Für echte Uploads und Änderungen auf der Live-Seite folgt als nächster technischer Schritt Cloudflare D1/R2 mit geschütztem Login.</p></article>
          </section>
        )}
      </main>
    </div>
  );
}

function HeroPreview({ slide }: { slide?: HeroSlide }) {
  if (!slide) return <div className="empty-state">Noch kein Slide vorhanden.</div>;
  return <div className="hero-preview"><img src={slide.image} alt="" /><div className="hero-preview-shade" /><div className="hero-preview-copy"><small>{slide.eyebrow}</small><h3>{slide.title}<br /><i>{slide.accent}</i></h3><p>{slide.text}</p><span>{slide.buttonLabel} →</span></div></div>;
}

function SlideEditor({ slide, index, total, update, remove, move, upload }: { slide: HeroSlide; index: number; total: number; update: (id: string, patch: Partial<HeroSlide>) => void; remove: (id: string) => void; move: (index: number, direction: -1 | 1) => void; upload: (id: string, event: ChangeEvent<HTMLInputElement>) => void }) {
  const [open, setOpen] = useState(index === 0);
  return <article className="slide-editor admin-panel"><header><div className="slide-thumb"><img src={slide.image} alt="" /><span>{index + 1}</span></div><div><small>SLIDE {index + 1}</small><h3>{slide.title} <i>{slide.accent}</i></h3></div><div className="slide-controls"><button disabled={index === 0} onClick={() => move(index, -1)} aria-label="Nach oben">↑</button><button disabled={index === total - 1} onClick={() => move(index, 1)} aria-label="Nach unten">↓</button><button onClick={() => setOpen(!open)}>{open ? "Schließen" : "Bearbeiten"}</button></div></header>{open && <div className="slide-form"><div className="image-editor"><HeroPreview slide={slide} /><label className="upload-button">Bild auswählen<input type="file" accept="image/*" onChange={(event) => upload(slide.id, event)} /></label><small>Empfohlen: WebP oder JPG, mindestens 1920 × 1080 px.</small></div><div className="field-grid"><label>Eyebrow<input value={slide.eyebrow} onChange={(e) => update(slide.id, { eyebrow: e.target.value })} /></label><label>Haupttitel<input value={slide.title} onChange={(e) => update(slide.id, { title: e.target.value })} /></label><label>Akzenttitel<input value={slide.accent} onChange={(e) => update(slide.id, { accent: e.target.value })} /></label><label className="full-field">Beschreibung<textarea rows={3} value={slide.text} onChange={(e) => update(slide.id, { text: e.target.value })} /></label><label>Button-Text<input value={slide.buttonLabel} onChange={(e) => update(slide.id, { buttonLabel: e.target.value })} /></label><label>Button-Link<input value={slide.buttonUrl} onChange={(e) => update(slide.id, { buttonUrl: e.target.value })} /></label><button className="danger-button" disabled={total <= 1} onClick={() => remove(slide.id)}>Slide entfernen</button></div></div>}</article>;
}
