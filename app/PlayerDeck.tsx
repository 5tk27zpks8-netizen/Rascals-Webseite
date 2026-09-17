"use client";

import { useEffect, useRef } from "react";
import type { Player } from "./lib/football";
import { RascalsPlayerCard } from "./team/RascalsPlayerCard";

/**
 * The squad as a deck of cards you scroll through.
 *
 * The cards stand in a row across the field, turned towards the viewer like a
 * hand being fanned out: the one in the middle faces you square on, the rest
 * angle away and fall back into the depth of the picture. Scrolling the page
 * walks the focus along the row.
 *
 * Only one number crosses from JavaScript to CSS — `--focus`, the fractional
 * index of the card at the centre. Every card works out its own position from
 * that and its own index, so a frame costs one custom-property write and no
 * layout: no per-card style writes, no React re-render while scrolling.
 *
 * Without JavaScript, or before this mounts, `--focus` is simply unset and the
 * stylesheet lays the cards out as a plain scrollable row. The deck is an
 * enhancement of something that already works.
 */
export function PlayerDeck({ players }: { players: Player[] }) {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element || players.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Below this the stylesheet shows a simple swipeable row instead.
    if (!window.matchMedia("(min-width: 760px)").matches) return;

    element.classList.add("is-deck");

    let frame = 0;
    const update = () => {
      frame = 0;
      const box = element.getBoundingClientRect();
      /* The deck is taller than the screen and its rail sticks, so the scroll
         distance it owns is exactly the overhang. 0 when its top reaches the
         top of the screen, 1 when its bottom does — every card gets its turn.
         Measuring against the viewport instead, as this first did, meant a
         short page never reached either end and most of the squad was
         unreachable. */
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
      <div className="deck-rail">
        {players.map((player, index) => (
          <div
            className="deck-card"
            key={player.id}
            style={{ "--i": index } as React.CSSProperties}
          >
            <RascalsPlayerCard player={player} />
          </div>
        ))}
      </div>
    </div>
  );
}
