"use client";

import { useEffect, useRef } from "react";
import type { Player } from "./lib/football";
import { RascalsPlayerCard } from "./team/RascalsPlayerCard";

/**
 * The squad standing out on the field, and you drive through them.
 *
 * The cards are not a row you pan along: they are posted down the length of the
 * pitch, spread across its width the way players are, and scrolling carries the
 * camera forward past them. One card is always closest — square on, full size,
 * readable — while the next ones stand further downfield, smaller and dimmer,
 * and the one you have passed slips behind you and goes.
 *
 * Only one number crosses from JavaScript to CSS: `--focus`, the fractional
 * index of the card the camera is level with. Every card works out its own
 * depth from that and its own index, so a scroll frame costs one
 * custom-property write — no per-card style writes, no React render.
 *
 * Without JavaScript, with reduced motion, or on a narrow screen the class
 * never arrives, `--focus` stays unset, and the same markup is a plain
 * swipeable row. The drive-through is an enhancement of something that works.
 */

/**
 * Lanes across the width of the pitch.
 *
 * Every card changes side from the one before it and no two neighbours share a
 * lane, so the squad reads as standing about the field rather than queued down
 * one stripe of it. The magnitudes are wide on purpose: perspective squeezes a
 * lane towards the middle the further downfield it is, so a sequence that
 * looks generous flat on the page comes out as a huddle once it has depth.
 *
 * Eleven of them, a prime count, so the cycle does not land the same lane
 * under the same card as the squad grows.
 */
const LANES = [0, 1.9, -1.45, 1.1, -2.05, 1.55, -0.85, 2.1, -1.75, 0.6, -1.2];

export function PlayerDeck({ players }: { players: Player[] }) {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element || players.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(min-width: 760px)").matches) return;

    element.classList.add("is-deck");

    /* Where the scroll says the camera is, and where it is actually drawn.
       They are not the same number: a wheel notch arrives as one jump of a
       hundred pixels or more, and writing that straight through moves the
       whole formation in a single frame. The drawn value chases the scrolled
       one instead, which is also what the stadium behind these cards does —
       when only one of the two glides, the page reads as broken rather than
       as fast. */
    let target = 0;
    let drawn = 0;
    let frame = 0;
    let last = 0;

    const measure = () => {
      const box = element.getBoundingClientRect();
      /* The deck is taller than the screen and its stage sticks, so the scroll
         it owns is exactly that overhang: 0 when its top meets the top of the
         screen, 1 when its bottom does. Measuring against the viewport instead
         means a short page never reaches either end of the squad. */
      const runway = box.height - window.innerHeight;
      const travel = runway > 0 ? -box.top / runway : 0;
      const clamped = Math.min(1, Math.max(0, travel));
      target = clamped * (players.length - 1);
    };

    const write = () => element.style.setProperty("--focus", drawn.toFixed(3));

    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      /* Exponential ease, expressed per second rather than per frame. A plain
         factor per frame converges twice as fast on a 120Hz screen as on a
         60Hz one, so the same page feels smooth on one machine and snappy on
         the next. This one settles at the same rate everywhere. */
      drawn += (target - drawn) * (1 - Math.exp(-3.6 * dt));

      if (Math.abs(target - drawn) < 0.002) {
        drawn = target;
        write();
        frame = 0;
        last = 0;
        return;
      }
      write();
      frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      measure();
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    measure();
    drawn = target;
    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      element.classList.remove("is-deck");
      element.style.removeProperty("--focus");
    };
  }, [players.length]);

  if (players.length === 0) return null;

  return (
    <div
      className="deck"
      ref={host}
      style={{ "--count": players.length } as React.CSSProperties}
    >
      <div className="deck-stage">
        {players.map((player, index) => (
          <div
            className="deck-card"
            key={player.id}
            style={
              {
                "--i": index,
                "--lane": LANES[index % LANES.length],
              } as React.CSSProperties
            }
          >
            <RascalsPlayerCard player={player} />
          </div>
        ))}
      </div>
    </div>
  );
}
