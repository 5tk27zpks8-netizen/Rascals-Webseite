"use client";

import { useEffect, useState } from "react";

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
    },
  ],
};

export function CmsHero() {
  const [cms, setCms] = useState<CmsState>(fallback);
  const [active, setActive] = useState(0);

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
    if (cms.slides.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % cms.slides.length),
      Math.max(3, cms.intervalSeconds || 7) * 1000,
    );
    return () => window.clearInterval(timer);
  }, [cms.intervalSeconds, cms.slides.length]);

  return (
    <>
      <style>{`.site-main > .hero:not(.cms-hero), main > .hero:not(.cms-hero){display:none!important}`}</style>
      <section className={`hero cms-hero cms-${cms.transition}`} aria-roledescription="Karussell" aria-label="Rascals Highlights">
        {cms.slides.map((slide, index) => (
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
        {cms.slides.length > 1 && (
          <div className="hero-controls" aria-label="Motiv auswählen">
            {cms.slides.map((slide, index) => (
              <button key={slide.id} onClick={() => setActive(index)} aria-label={`Motiv ${index + 1}`} className={index === active ? "active" : ""} />
            ))}
          </div>
        )}
        <div className="scroll-note">SCROLL TO HUDDLE <span>↓</span></div>
      </section>
    </>
  );
}
