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

    /* The class only decides whether the arrival is animated. Everything it
       plays over is visible without it, which is the point: this page has a
       stadium rendering on the same thread, and a callback that arrives late
       must not be the difference between a call and a blank screen.

       Bringing the end zone to rest is the browser's job now — one CSS snap
       point, see arena-roster.css. A script doing it by hand was cancelled by
       the next flick every time, which is what a smooth scroll is for. */
    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          node.classList.add("is-in");
          watcher.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    watcher.observe(node);

    return () => watcher.disconnect();
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
