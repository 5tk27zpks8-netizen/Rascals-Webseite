"use client";

import { useEffect, useMemo, useState } from "react";

type HeroButtonStyle = "red" | "ghost" | "light";
type HeroTransition = "fade" | "slide" | "zoom" | "parallax";

type HeroSlide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
  buttonStyle?: HeroButtonStyle;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  secondaryButtonStyle?: HeroButtonStyle;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

type CmsState = {
  slides: HeroSlide[];
  intervalSeconds: number;
  transition: HeroTransition;
};

const fallback: CmsState = {
  intervalSeconds: 7,
  transition: "fade",
  slides: [
    {
      id: "fallback",
      image: "/helmet-hero-4k.webp",
      eyebrow: "American Football · Heidenheim",
      title: "HART. ECHT.",
      accent: "RASCALS.",
      text: "Ein Team. Eine Familie. Bereit für den nächsten Snap.",
      buttonLabel: "Teil des Teams werden",
      buttonUrl: "mailto:football@hsb1846.de",
      buttonStyle: "red",
      secondaryButtonLabel: "Spielplan 2026",
      secondaryButtonUrl: "/#spielplan",
      secondaryButtonStyle: "ghost",
      active: true,
    },
  ],
};

function isVisible(slide: HeroSlide, now: number) {
  if (slide.active === false) return false;
  const starts = slide.startsAt ? Date.parse(slide.startsAt) : Number.NaN;
  const ends = slide.endsAt ? Date.parse(slide.endsAt) : Number.NaN;
  if (!Number.isNaN(starts) && now < starts) return false;
  if (!Number.isNaN(ends) && now > ends) return false;
  return true;
}

function buttonClass(style?: HeroButtonStyle) {
  if (style === "ghost") return "button ghost";
  if (style === "light") return "button light";
  return "button red";
}

export function CmsHero() {
  const [cms, setCms] = useState<CmsState>(fallback);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-cms")
      .then((response) => {
        if (!response.ok) throw new Error("CMS unavailable");
        return response.json() as Promise<CmsState>;
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.slides) && data.slides.length) {
          setCms(data);
          setActive(0);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const slides = useMemo(() => {
    const visible = cms.slides.filter((slide) => isVisible(slide, now));
    return visible.length ? visible : fallback.slides;
  }, [cms.slides, now]);

  useEffect(() => {
    if (active >= slides.length) setActive(0);
  }, [active, slides.length]);

  useEffect(() => {
    if (slides.length < 2 || !playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      Math.max(3, cms.intervalSeconds || 7) * 1000,
    );
    return () => window.clearInterval(timer);
  }, [cms.intervalSeconds, slides.length, playing]);

  return (
    <>
      <style>{`
        .site-main > .hero:not(.cms-hero), main > .hero:not(.cms-hero){display:none!important}
        .cms-hero .cms-hero-slide{opacity:0;pointer-events:none;transition:opacity .75s ease,transform .85s ease}
        .cms-hero .cms-hero-slide.visible{opacity:1;pointer-events:auto}
        .cms-hero.cms-slide .cms-hero-slide{transform:translateX(7%)}
        .cms-hero.cms-slide .cms-hero-slide.visible{transform:translateX(0)}
        .cms-hero.cms-zoom .cms-hero-slide img{transform:scale(1.08);transition:transform 6s ease}
        .cms-hero.cms-zoom .cms-hero-slide.visible img{transform:scale(1)}
        .cms-hero.cms-parallax .cms-hero-slide img{transform:scale(1.06) translateX(2%);transition:transform 7s ease}
        .cms-hero.cms-parallax .cms-hero-slide.visible img{transform:scale(1.06) translateX(-2%)}
      `}</style>
      <section data-hero-pin className={`hero cms-hero cms-${cms.transition}`} aria-roledescription="Karussell" aria-label="Rascals Highlights">
        {slides.map((slide, index) => (
          <div key={slide.id} className={`hero-slide cms-hero-slide ${index === active ? "visible" : ""}`} aria-hidden={index !== active}>
            <img src={slide.image} alt={slide.title ? `${slide.title} ${slide.accent}` : "Rascals Highlight"} />
            <div className="hero-shade" />
            <div className="hero-copy">
              <span className="eyebrow">{slide.eyebrow}</span>
              <h1 data-split-reveal><span>{slide.title}</span><br /><i>{slide.accent}</i></h1>
              <p>{slide.text}</p>
              <div className="button-row">
                {slide.buttonLabel && slide.buttonUrl && <a className={buttonClass(slide.buttonStyle)} href={slide.buttonUrl}>{slide.buttonLabel} <span>→</span></a>}
                {slide.secondaryButtonLabel && slide.secondaryButtonUrl && <a className={buttonClass(slide.secondaryButtonStyle)} href={slide.secondaryButtonUrl}>{slide.secondaryButtonLabel} <span>→</span></a>}
              </div>
            </div>
          </div>
        ))}
        {slides.length > 1 && (
          <div className="hero-controls" aria-label="Motiv auswählen">
            {slides.map((slide, index) => (
              <button key={slide.id} onClick={() => setActive(index)} aria-label={`Motiv ${index + 1}`} className={index === active ? "active" : ""} />
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
        )}
      </section>
    </>
  );
}
