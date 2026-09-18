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

/**
 * How many stand in each rank, cycled down the formation.
 *
 * Not a fixed three. A formation where every rank is the same width is a
 * grid, and a grid in perspective reads as a spreadsheet however well it is
 * lit — the eye finds the repeat immediately. Mixing threes and twos gives
 * the ranks different silhouettes, and the narrower ones open a gap that the
 * rank behind shows through.
 *
 * Five entries against a stagger that alternates on a period of two, so the
 * two cycles only line up again every ten ranks.
 */
const RANKS = [3, 2, 3, 3, 2];

/**
 * How far a row is nudged sideways from the one in front of it.
 *
 * Without it the three columns line up into three straight corridors running
 * away from the camera, which is a spreadsheet in perspective. Alternating the
 * rows by a fraction of a column breaks the corridors without breaking the
 * rows — the same offset a real formation has.
 */
const STAGGER = 0.28;

/** A card in the deck, and whether it is a player or one of the staff. */
export type DeckEntry = { player: Player; coach?: boolean };

/** Deal the squad into ranks of the widths RANKS cycles through. */
function intoRanks(entries: DeckEntry[]) {
  const ranks: DeckEntry[][] = [];
  let index = 0;
  while (index < entries.length) {
    const width = RANKS[ranks.length % RANKS.length];
    ranks.push(entries.slice(index, index + width));
    index += width;
  }
  return ranks;
}

export function PlayerDeck({ entries }: { entries: DeckEntry[] }) {
  const host = useRef<HTMLDivElement | null>(null);
  const ranks = intoRanks(entries);
  const rows = ranks.length;

  useEffect(() => {
    const element = host.current;
    if (!element || rows === 0) return;
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

    /* Which ranks can be clicked.
       A card the camera has passed is invisible, but it is also enormous and
       still in front of everything — and an element at zero opacity takes
       pointer events exactly like any other. So the ranks behind the camera
       were swallowing every click on the squad: nothing in the deck was
       reachable once the first rank had gone by.

       Rather than fight that per card, only the ranks you could actually read
       are given pointer events at all: the one the camera is level with and
       the couple standing in front of it. Everything else is inert. */
    const byRow: HTMLElement[][] = [];
    element.querySelectorAll<HTMLElement>(".deck-card").forEach((card) => {
      const row = Number(card.style.getPropertyValue("--row")) || 0;
      (byRow[row] ??= []).push(card);
    });
    let liveFrom = -1;
    let liveTo = -1;

    const applyLive = () => {
      const from = Math.max(0, Math.ceil(drawn - 0.3));
      const to = Math.min(byRow.length - 1, Math.floor(drawn + 2.2));
      if (from === liveFrom && to === liveTo) return;
      byRow.forEach((cards, row) => {
        const live = row >= from && row <= to;
        cards.forEach((card) => card.classList.toggle("is-live", live));
      });
      liveFrom = from;
      liveTo = to;
    };

    const write = () => {
      element.style.setProperty("--focus", drawn.toFixed(3));
      applyLive();
    };

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
      byRow.forEach((cards) => cards.forEach((card) => card.classList.remove("is-live")));
    };
  }, [rows]);

  if (entries.length === 0) return null;

  return (
    <div
      className="deck"
      ref={host}
      style={{ "--rows": rows } as React.CSSProperties}
    >
      <div className="deck-stage">
        {ranks.map((rank, row) =>
          rank.map((entry, column) => {
            /* Centred on however many this rank holds, so a rank of two sits
               either side of the middle rather than starting where the first
               of three would have — and spread wider than the column pitch,
               because a pair left on the three-wide spacing reads as a rank
               with a card missing out of the middle. Opening them out uses
               the width and leaves a gap for the rank behind to show through,
               which is the whole reason for mixing the widths. */
            const spread = rank.length === 2 ? 1.7 : 1;
            const across =
              (column - (rank.length - 1) / 2) * spread +
              (row % 2 === 0 ? -STAGGER : STAGGER);

            return (
              <div
                className={entry.coach ? "deck-card is-coach" : "deck-card"}
                key={entry.player.id}
                style={
                  {
                    "--row": row,
                    "--x": across.toFixed(3),
                  } as React.CSSProperties
                }
              >
                <RascalsPlayerCard player={entry.player} />
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
