"use client";

import { useEffect } from "react";

/**
 * Scroll choreography for the public site.
 *
 * Every effect here earns its place:
 *  - word reveals give headlines a spoken cadence instead of a fade
 *  - block reveals establish reading order as a section enters
 *  - the hero pins and hands off to the page, so the first scroll
 *    reads as a transition rather than the hero sliding away
 *  - parallax gives the stadium photography depth
 *  - counters make the club's numbers land as a beat
 *  - yard lines fill to mark section boundaries (football motif)
 *  - the sponsor strip pans horizontally while its section is held
 *
 * GSAP is imported lazily so it never blocks first paint, and the whole
 * module is a no-op when the visitor prefers reduced motion.
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
        // --- Headlines arrive word by word -----------------------
        const splitHeadline = (element: HTMLElement) => {
          if (element.dataset.split === "done") return;
          element.dataset.split = "done";
          element.querySelectorAll<HTMLElement>(":scope > span, :scope > i").forEach((part) => {
            const words = (part.textContent ?? "").split(/\s+/).filter(Boolean);
            if (!words.length) return;
            part.textContent = "";
            words.forEach((word, index) => {
              const outer = document.createElement("span");
              outer.className = "rascals-word";
              outer.style.setProperty("--word-delay", `${index * 55}ms`);
              const inner = document.createElement("span");
              inner.textContent = word;
              outer.appendChild(inner);
              part.appendChild(outer);
              if (index < words.length - 1) part.appendChild(document.createTextNode(" "));
            });
          });
        };

        gsap.utils.toArray<HTMLElement>("[data-split-reveal]").forEach((element) => {
          splitHeadline(element);
          ScrollTrigger.create({
            trigger: element,
            start: "top 90%",
            once: true,
            onEnter: () =>
              element.querySelectorAll<HTMLElement>(".rascals-word").forEach((word) => word.classList.add("is-revealed")),
          });
        });

        // --- Block reveals ---------------------------------------
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

        // Hidden-until-scrolled is a real risk: these elements start at zero
        // opacity, so anything the triggers miss stays invisible for good.
        // Triggers measure positions before late images change the layout, so
        // refresh once the page has fully loaded, and sweep up anything that is
        // on screen but still hidden. Content beats choreography.
        const revealWhatIsOnScreen = () => {
          document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)").forEach((element) => {
            if (element.getBoundingClientRect().top < window.innerHeight * 1.1) element.classList.add("is-revealed");
          });
        };
        if (document.readyState === "complete") ScrollTrigger.refresh();
        else window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
        const sweep = window.setInterval(revealWhatIsOnScreen, 1200);
        window.setTimeout(() => window.clearInterval(sweep), 12000);

        // --- Hero hand-off ---------------------------------------
        // The hero holds while its copy lifts and dims, so leaving the
        // hero reads as a deliberate transition into the page.
        const hero = document.querySelector<HTMLElement>("[data-hero-pin]");
        const heroCopy = hero?.querySelector<HTMLElement>(".hero-copy, .sb-hero-copy");
        if (hero && heroCopy && window.innerWidth > 900) {
          gsap.to(heroCopy, {
            yPercent: -18,
            opacity: 0,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

        // --- Parallax on photography -----------------------------
        gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
          const strength = Number(element.dataset.parallax ?? 12);
          gsap.to(element, {
            yPercent: strength,
            ease: "none",
            scrollTrigger: {
              trigger: element.parentElement ?? element,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          });
        });

        // --- Counters --------------------------------------------
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

        // --- Yard lines ------------------------------------------
        gsap.utils.toArray<HTMLElement>(".rascals-yardline").forEach((element) => {
          ScrollTrigger.create({
            trigger: element,
            start: "top 92%",
            once: true,
            onEnter: () => element.style.setProperty("--yardline-fill", "100%"),
          });
        });

        // --- Horizontal pan --------------------------------------
        // Used for strips that are wider than the viewport: the section
        // is held while its track slides, so nothing is missed.
        gsap.utils.toArray<HTMLElement>("[data-pan]").forEach((wrapper) => {
          const track = wrapper.querySelector<HTMLElement>("[data-pan-track]");
          if (!track || window.innerWidth < 900) return;
          const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
          if (distance() <= 0) return;
          gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: wrapper,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
            },
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
