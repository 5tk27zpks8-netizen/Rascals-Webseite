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
 * Lanes across the width of the pitch. Five of them, and the sequence never
 * repeats a lane back to back, so consecutive cards are never in line with
 * each other — the squad reads as standing about the field rather than queued
 * down one stripe of it.
 */
const LANES = [0, 1.55, -1.1, 0.72, -1.72, 1.12, -0.6, 1.8, -1.35, 0.35];

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
