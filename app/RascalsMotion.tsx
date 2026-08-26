"use client";

import { useEffect } from "react";

/**
 * Scroll choreography for the public site.
 *
 * Every animation here has one job:
 *  - reveals establish reading order as a section enters
 *  - the hero parallax gives depth to the stadium photography
 *  - stat counters make the club's numbers land as a beat
 *  - yard lines fill to mark section boundaries (football motif)
 *
 * Nothing loops forever, nothing hijacks the scroll. GSAP is loaded
 * lazily so it never blocks first paint, and the whole module is a
 * no-op when the visitor prefers reduced motion.
 */
export function RascalsMotion() {
  useEffect(() => {
    document.documentElement.classList.remove("no-js");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("is-revealed"));
      return;
    }

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        // --- Reveals: order-of-reading, staggered per section ---
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          ScrollTrigger.create({
            trigger: element,
            start: "top 88%",
            once: true,
            onEnter: () => {
              const delay = Number(element.dataset.revealDelay ?? 0);
              gsap.delayedCall(delay / 1000, () => element.classList.add("is-revealed"));
            },
          });
        });

        // --- Hero parallax: photography drifts slower than copy ---
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
          const strength = Number(element.dataset.parallax ?? 12);
          gsap.to(element, {
            yPercent: strength,
            ease: "none",
            scrollTrigger: {
              trigger: element.parentElement ?? element,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        });

        // --- Stat counters: the numbers arrive, they don't just sit ---
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((element) => {
          const target = Number(element.dataset.count ?? 0);
          const suffix = element.dataset.countSuffix ?? "";
          const state = { value: 0 };
          ScrollTrigger.create({
            trigger: element,
            start: "top 90%",
            once: true,
            onEnter: () => {
              gsap.to(state, {
                value: target,
                duration: 1.1,
                ease: "power2.out",
                onUpdate: () => {
                  element.textContent = `${Math.round(state.value)}${suffix}`;
                },
              });
            },
          });
        });

        // --- Yard lines fill as the section boundary is crossed ---
        gsap.utils.toArray<HTMLElement>(".rascals-yardline").forEach((element) => {
          ScrollTrigger.create({
            trigger: element,
            start: "top 92%",
            once: true,
            onEnter: () => element.style.setProperty("--yardline-fill", "100%"),
          });
        });
      });

      cleanup = () => ctx.revert();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
