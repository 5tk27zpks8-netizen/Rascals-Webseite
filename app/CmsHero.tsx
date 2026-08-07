"use client";

import { useEffect, useMemo, useState } from "react";

type HeroSlide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

type CmsState = {
  slides: HeroSlide[];
  intervalSeconds: number;
  transition: "fade" | "slide";
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

export function CmsHero() {
  const [cms, setCms] = useState<CmsState>(fallback);
  const [active, setActive] = useState(0);
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
    if (slides.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      Math.max(3, cms.intervalSeconds || 7) * 1000,
    );
    return () => window.clearInterval(timer);
  }, [cms.intervalSeconds, slides.length]);

  return (
    <>
      <style>{`.site-main > .hero:not(.cms-hero), main > .hero:not(.cms-hero){display:none!important}`}</style>
      <section className={`hero cms-hero cms-${cms.transition}`} aria-roledescription="Karussell" aria-label="Rascals Highlights">
        {slides.map((slide, index) => (
          <div key={slide.id} className={`hero-slide cms-hero-slide ${index === active ? "visible" : ""}`} aria-hidden={index !== active}>
            <img src={slide.image} alt={slide.title ? `${slide.title} ${slide.accent}` : "Rascals Highlight"} />
            <div className="hero-shade" />
            <div className="hero-copy">
              <span className="eyebrow">{slide.eyebrow}</span>
              <h1>{slide.title}<br /><i>{slide.accent}</i></h1>
              <p>{slide.text}</p>
              <div className="button-row">
                <a className="button red" href={slide.buttonUrl}>{slide.buttonLabel} <span>→</span></a>
              </div>
            </div>
          </div>
        ))}
        {slides.length > 1 && (
          <div className="hero-controls" aria-label="Motiv auswählen">
            {slides.map((slide, index) => (
              <button key={slide.id} onClick={() => setActive(index)} aria-label={`Motiv ${index + 1}`} className={index === active ? "active" : ""} />
            ))}
          </div>
        )}
        <div className="scroll-note">SCROLL TO HUDDLE <span>↓</span></div>
      </section>
    </>
  );
}
