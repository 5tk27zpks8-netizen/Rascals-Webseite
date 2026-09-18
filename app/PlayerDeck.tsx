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

    let frame = 0;
    const update = () => {
      frame = 0;
      const box = element.getBoundingClientRect();
      /* The deck is taller than the screen and its stage sticks, so the scroll
         it owns is exactly that overhang: 0 when its top meets the top of the
         screen, 1 when its bottom does. Measuring against the viewport instead
         means a short page never reaches either end of the squad. */
      const runway = box.height - window.innerHeight;
      const travel = runway > 0 ? -box.top / runway : 0;
      const clamped = Math.min(1, Math.max(0, travel));
      element.style.setProperty("--focus", (clamped * (players.length - 1)).toFixed(3));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
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
