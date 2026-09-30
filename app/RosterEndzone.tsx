"use client";

import { useEffect, useRef } from "react";

/**
 * THE END OF THE DRIVE.
 *
 * Seventy-odd cards and then the page simply stopped, at the bottom of the
 * last row, with the switch bar over it. A drive that ends by running out of
 * page has not ended; it has been abandoned.
 *
 * So the last card is not the last thing. Past it the reader is taken the
 * rest of the way — one smooth pull into the end zone, where the call is
 * waiting.
 *
 * THE PULL IS DELIBERATELY SMALL AND ONLY HAPPENS ONCE.
 *
 * Taking the scroll out of somebody's hands is the rudest thing a page can
 * do, so this is fenced on three sides: it fires only when the end zone is
 * already a fifth of the way onto the screen, only while the reader is
 * travelling down the page, and only the first time. Scroll back up and out
 * and nothing grabs you again. Somebody who has asked for less movement is
 * not pulled at all — the end zone is simply there when they arrive, which is
 * the same ending without the ride.
 */
export function RosterEndzone() {
  const host = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Where a pull lands: the page reserves room at the top for the bar that
       is fixed over it, and `scrollIntoView` honours that, so "arrived" is
       that offset rather than zero. */
    const landing = 110;
    let previous = window.scrollY;
    let goingDown = true;
    let attempts = 0;
    let idle = 0;

    const consider = () => {
      const top = node.getBoundingClientRect().top;
      /* Settled. Nothing more to do, ever. */
      if (top <= landing) { attempts = 99; return; }
      /* Scrolled right back out of it: the drive can be finished again. */
      if (top > window.innerHeight) { attempts = 0; return; }
      if (top > window.innerHeight * 0.82) return;
      if (reduced || !goingDown || attempts >= 3) return;
      attempts += 1;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    /* THE PULL WAITS FOR THE FLICK TO FINISH.

       A smooth scroll is cancelled by the next scroll the reader makes, and
       on a phone a flick is dozens of them. Pulling the moment the end zone
       appears therefore did nothing at all in the one case that matters: the
       pull started, the flick killed it, and because it had already been
       spent the ending never completed. Measured — the section stopped 594
       pixels down a 800-pixel screen and stayed there.

       So it waits for the scrolling to stop first, and may try twice more if
       it is interrupted anyway. Three is the ceiling: past that the reader is
       clearly steering, and the page should let them. */
    const onScroll = () => {
      const y = window.scrollY;
      goingDown = y > previous;
      previous = y;
      window.clearTimeout(idle);
      idle = window.setTimeout(consider, 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    /* The call arrives whether or not the page was pulled, so it is also
       right for a reader who scrolled here themselves, and for one who has
       asked for less movement and is never pulled at all. */
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) node.classList.add("is-in");
        }
      },
      { threshold: 0.2 },
    );
    watcher.observe(node);

    return () => {
      watcher.disconnect();
      window.clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section className="roster-endzone" ref={host} aria-label="Endzone">
      <span className="roster-endzone-eyebrow">END ZONE · 0 YARDS TO GO</span>
      {/* Two pieces rather than one word: at a phone's width a single
          eleven-letter word breaks wherever it runs out of room — "TOUCHDOOO"
          over "WN" — and a call that breaks mid-syllable is a typo. Side by
          side where there is room, stacked where there is not, and the break
          is always in the same place. */}
      <strong className="roster-endzone-word">
        <span>TOUCH</span>
        <i>DOOOWN</i>
      </strong>
      <p className="roster-endzone-line">Das ist der Kader. Der ganze Drive, von der eigenen 20 bis hier.</p>
    </section>
  );
}
