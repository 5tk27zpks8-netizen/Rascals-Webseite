"use client";

import { useEffect, useRef } from "react";
import type { Player } from "./lib/football";
import { RascalsPlayerCard } from "./team/RascalsPlayerCard";

/**
 * The squad standing out on the field, and you drive through them.
 *
 * The cards are not a row you pan along: they stand three abreast in ranks
 * posted down the length of the pitch, and scrolling carries the camera
 * forward past them. One rank is always closest — square on, full size,
 * readable — while the ranks behind it stand further downfield, smaller and
 * dimmer, and the one you have passed slips behind you and goes.
 *
 * Three at a time rather than one: single file meant the squad arrived as a
 * long queue of cards at every depth at once, which is busier to look at and
 * three times as far to scroll.
 *
 * Only one number crosses from JavaScript to CSS: `--focus`, the fractional
 * index of the rank the camera is level with. Every card works out its own
 * depth from that and its own row, so a scroll frame costs one
 * custom-property write — no per-card style writes, no React render.
 *
 * Without JavaScript, with reduced motion, or on a narrow screen the class
 * never arrives, `--focus` stays unset, and the same markup is a plain
 * swipeable row. The drive-through is an enhancement of something that works.
 */

/** Three abreast: the squad lines up in rows rather than single file. */
const ACROSS = 3;

/**
 * How far a row is nudged sideways from the one in front of it.
 *
 * Without it the three columns line up into three straight corridors running
 * away from the camera, which is a spreadsheet in perspective. Alternating the
 * rows by a fraction of a column breaks the corridors without breaking the
 * rows — the same offset a real formation has.
 */
const STAGGER = 0.28;

export function PlayerDeck({ players }: { players: Player[] }) {
  const host = useRef<HTMLDivElement | null>(null);
  const rows = Math.ceil(players.length / ACROSS);

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
      /* Counted in rows now, not in players: the camera travels from the front
         row to the back one, and each row carries three of the squad. */
      target = clamped * (rows - 1);
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
  }, [players.length, rows]);

  if (players.length === 0) return null;

  return (
    <div
      className="deck"
      ref={host}
      style={{ "--rows": rows } as React.CSSProperties}
    >
      <div className="deck-stage">
        {players.map((player, index) => {
          const row = Math.floor(index / ACROSS);
          const column = index % ACROSS;
          /* The last row is rarely full. Centring it on however many it holds
             stops a squad of ten from ending on one card hanging off to the
             left where the row's first column happens to be. */
          const inRow = Math.min(ACROSS, players.length - row * ACROSS);
          const across =
            column - (inRow - 1) / 2 + (row % 2 === 0 ? -STAGGER : STAGGER);

          return (
            <div
              className="deck-card"
              key={player.id}
              style={
                {
                  "--row": row,
                  "--x": across.toFixed(3),
                } as React.CSSProperties
              }
            >
              <RascalsPlayerCard player={player} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
