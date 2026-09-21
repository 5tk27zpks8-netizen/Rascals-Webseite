"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Player } from "./lib/football";
import { holdDrive, releaseDrive, subscribeDrive } from "./lib/drive-scroll";
import { PlayerDetailPanel } from "./showcase/PlayerDetailPanel";
import { ShowcaseCard } from "./showcase/ShowcaseCard";
import "./showcase/showcase.css";

/**
 * The squad standing out on the field, and you fly through them.
 *
 * The cards are not a row you pan along: they stand two and three abreast in
 * ranks posted down the length of the pitch, and scrolling carries the camera
 * forward past them — the near ones growing and dissolving as they reach you,
 * the far ones waiting their turn down the field.
 *
 * Only one number crosses from JavaScript to CSS: `--focus`, the fractional
 * index of the card the camera is level with. Every card works out its own
 * depth from that and its own index, so a scroll frame costs one custom
 * property write — no per-card style writes, no React render.
 *
 * ---------------------------------------------------------------------
 * THE DECK DOES NOT SMOOTH ANYTHING
 *
 * It used to. It kept its own integrator, chasing its own measurement of its
 * own runway, while the stadium behind it kept a second one against the
 * document. Two smoothed numbers describing one motion, and they drifted —
 * the ground sliding under a foreground that had already settled is what read
 * as being thrown backwards.
 *
 * Now the smoothing happens once, upstream, in drive-scroll, and the deck is
 * handed the result. All this does is convert those pixels into its own
 * coordinate, which is an increasing affine map and so cannot reintroduce a
 * backwards step. The stadium and the squad are the same number on the same
 * frame, by construction.
 *
 * Without JavaScript, with reduced motion, or on a narrow screen the class
 * never arrives, `--focus` stays unset, and the same markup is a plain
 * swipeable row. The fly-through is an enhancement of something that works.
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
 * Without it the columns line up into straight corridors running away from
 * the camera, which is a spreadsheet in perspective. Alternating the rows by
 * a fraction of a column breaks the corridors without breaking the rows.
 */
const STAGGER = 0.28;

/**
 * How far the formation itself winds across the field, and over what period.
 *
 * This is where the weave lives now, and moving it here is the fix rather
 * than a decoration.
 *
 * The drive used to weave by sliding the camera sideways on a sine of the
 * scroll. But these cards are pinned to the screen: the ground swung left and
 * right underneath them while they sat still, and a foreground that refuses
 * to follow the background is exactly the disagreement the eye reports as
 * being shoved. It happened wherever that sine was steepest — two or three
 * places down the page, which is precisely where it was being felt.
 *
 * So the camera now flies dead straight and the *formation* is what winds.
 * Each card's place across the field carries a slow sine of its depth, laid
 * out once at render and never touched again. You still thread a winding
 * column of players; nothing in the picture moves against anything else,
 * because the winding is baked into where the cards stand rather than into
 * how the camera travels.
 */
const SNAKE_AMPLITUDE = 0.5;
const SNAKE_PERIOD = 14;

/**
 * Depth is the card's place in the running order, not its rank.
 *
 * Ranks make a poor depth axis: three cards spread across one rank length sit
 * a third apart, two cards across the same length sit half apart, and the
 * widths alternate — so the formation hands over across a different sized gap
 * every time, and the biggest gaps are the ones that jolt.
 *
 * Counting cards instead makes every gap exactly one card wide, so the step
 * from one to the next is the same everywhere. Ranks still decide where a
 * card stands across the field; they no longer decide how far away it is.
 */
const DEPTH_PER_CARD = 1;

/**
 * How much of the deck's scroll the formation itself takes up.
 *
 * The rest is the finish. The squad used to run the full length of the page,
 * which meant the catch — the thing the drive is built to end on — happened
 * behind a wall of cards, off to one side, at the exact moment the formation
 * was at its most crowded. Nobody could see it.
 *
 * Ending the formation early leaves the last fifth of the page as clear field:
 * the last card passes, the stadium opens out, and the only things left in
 * frame are the receiver and the ball coming down into his hands.
 */
const FORMATION_SPAN = 0.8;

/**
 * The band of the formation that takes clicks, in card-lengths ahead of the
 * camera.
 *
 * The near edge sits past the card currently dissolving in the lens — see the
 * note in the effect below, which is the whole reason this is a band. At 0.6 a
 * card is a little over half faded in, which is the point it becomes something
 * a person would aim at rather than something they are looking through.
 *
 * The far edge is where cards are still a reasonable target: beyond four and a
 * half lengths they are small, heavily overlapped by the ones in front, and
 * anyone trying to hit one is more likely to catch a neighbour.
 */
const LIVE_NEAR = 0.6;
const LIVE_FAR = 4.5;

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
  /* Which player's dossier is up, if any. Kept here rather than above the
     three decks because only one of them is ever on screen, so only one can
     ever have been clicked — and a single owner is one fewer thing to keep in
     step than a shared store would be. */
  const [opened, setOpened] = useState<DeckEntry | null>(null);
  const openCard = useCallback(
    (player: Player) => {
      setOpened(entries.find((entry) => entry.player.id === player.id) ?? null);
    },
    [entries],
  );
  const closeCard = useCallback(() => setOpened(null), []);
  const ranks = intoRanks(entries);
  const rows = ranks.length;
  /* The squad starts one card in front of the camera rather than level with
     it, or the very first card is already half dissolved before anybody has
     scrolled.

     The travel runs past the last card rather than stopping level with it. It
     used to stop just short, which left the final card sitting at four tenths
     of a card out — still a third opaque — hanging in the corner of the frame
     through the whole catch. The formation has to be gone for the finish to be
     clear, so the camera goes far enough past the back of it that every card
     has faded out. */
  const depthSpan = Math.max(1, entries.length * DEPTH_PER_CARD + 1.2);

  /* Pin the page while the dossier is open, and hand the drive back its
     position on the way out.

     Pinning is `position: fixed` on the body, which is the only approach that
     also stops a phone's rubber-band scrolling. It costs the scroll position,
     so that is saved and restored — with smooth scrolling switched off for the
     restore, or the page would glide back to where it already is.

     `holdDrive` has to bracket this. A pinned body reports scrollY of zero,
     and the drive reads scrollY every frame, so without the hold the stadium
     would fly back to the start of the field behind the open panel. */
  useEffect(() => {
    if (!opened) return;
    const y = window.scrollY;
    const body = document.body;
    const root = document.documentElement;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };

    holdDrive();
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;

      const smooth = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      root.style.scrollBehavior = smooth;

      releaseDrive(y);
    };
  }, [opened]);

  useEffect(() => {
    const element = host.current;
    if (!element || rows === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(min-width: 760px)").matches) return;

    element.classList.add("is-deck");

    /* Which cards can be clicked — a window, not a half-line.

       An element's opacity has nothing to do with whether it takes a click, and
       in a formation seen in perspective that is a trap with two sides to it.

       Behind the camera: a card that has passed is transparent but enormous and
       drawn in front of everything, so it swallows every click aimed at the
       squad. That was the first half of this rule and it was right.

       But the same is true of the card *dissolving* in front of the camera. It
       is a card-length from the lens, covering most of the screen, carrying the
       highest z-index of anything on it — and by the time anyone has decided to
       click it, it is down to a fifth of its opacity. So people aimed at the
       card they could actually read, one step further down the field, and hit
       the ghost in front of it instead. Cards "not all clickable", reported and
       never properly fixed, because the rule only closed one end.

       So: only the cards that are genuinely readable are interactive — from far
       enough ahead that the dissolving one is excluded, to far enough back that
       the tiny ones at the end of the formation are not stealing clicks either.
       Every card passes through this window, and while it is in it, it is the
       thing you can see and the thing you can hit. */
    const byDepth: HTMLElement[][] = [];
    element.querySelectorAll<HTMLElement>(".deck-card").forEach((card) => {
      const depth = Math.round(Number(card.style.getPropertyValue("--i")) || 0);
      (byDepth[depth] ??= []).push(card);
    });

    let liveFrom = -1;
    let liveTo = -1;
    /* Negative infinity rather than NaN, and this is not a style preference.
       Every comparison against NaN is false, including the one below, so a NaN
       seed meant the first write never cleared its own threshold and `--focus`
       was never set at all: the formation stood still for the whole page while
       the stadium flew past it. Seeding below every possible value makes the
       first frame unconditionally a write. */
    let written = Number.NEGATIVE_INFINITY;

    const unsubscribe = subscribeDrive((drive) => {
      /* A hidden squad — the tabs keep all three decks in the document and
         show one — has no box worth measuring and nothing to draw. Skipping
         here is also what keeps the per-frame layout read down to the one
         deck that is actually on screen. */
      if (element.offsetParent === null) return;

      const box = element.getBoundingClientRect();
      const runway = element.offsetHeight - window.innerHeight;
      if (runway <= 0) return;

      /* The deck's own stretch of the document, in the same pixels the engine
         hands out. `box.top` is measured against the real scroll position, so
         adding the real scroll gives the deck's fixed offset in the document,
         and the smoothed position is then read against that. Mixing the two —
         a smoothed position against a box measured at the smoothed position —
         is a feedback loop, and it is worth being explicit about which is
         which. */
      const deckTop = box.top + drive.rawScroll;
      const travelled = (drive.scroll - deckTop) / runway / FORMATION_SPAN;
      const clamped = Math.min(1, Math.max(0, travelled));

      /* Counted in cards: the camera travels from the first of the squad to
         the last, one card at a time, whatever width the ranks happen to be.
         Increasing in `drive.scroll`, which is the whole reason a backwards
         step cannot appear here. */
      const focus = clamped * depthSpan;

      if (Math.abs(focus - written) >= 0.0005) {
        element.style.setProperty("--focus", focus.toFixed(3));
        written = focus;
      }

      /* In card-lengths ahead of the camera: past the one dissolving in the
         lens, up to where they are still big enough to aim at. */
      const from = Math.max(0, Math.ceil(focus + LIVE_NEAR));
      const to = Math.floor(focus + LIVE_FAR);
      if (from !== liveFrom || to !== liveTo) {
        byDepth.forEach((cards, depth) => {
          const live = depth >= from && depth <= to;
          cards.forEach((card) => card.classList.toggle("is-live", live));
        });
        liveFrom = from;
        liveTo = to;
      }
    });

    return () => {
      unsubscribe();
      element.classList.remove("is-deck");
      element.style.removeProperty("--focus");
      byDepth.forEach((cards) => cards.forEach((card) => card.classList.remove("is-live")));
    };
  }, [rows, depthSpan]);

  if (entries.length === 0) return null;

  return (
    <div
      className="deck"
      ref={host}
      style={{ "--cards": entries.length } as React.CSSProperties}
    >
      <div className="deck-stage">
        {ranks.map((rank, row) =>
          rank.map((entry, column) => {
            const index = ranks.slice(0, row).reduce((n, r) => n + r.length, 0) + column;
            /* Centred on however many this rank holds, so a rank of two sits
               either side of the middle rather than starting where the first
               of three would have — and spread wider than the column pitch,
               because a pair left on the three-wide spacing reads as a rank
               with a card missing out of the middle. */
            const spread = rank.length === 2 ? 1.7 : 1;
            const across =
              (column - (rank.length - 1) / 2) * spread +
              (row % 2 === 0 ? -STAGGER : STAGGER) +
              /* The winding column. Baked in here, where it costs nothing and
                 can disagree with nothing — see SNAKE_AMPLITUDE. */
              Math.sin((index / SNAKE_PERIOD) * Math.PI * 2) * SNAKE_AMPLITUDE;

            return (
              <div
                className={entry.coach ? "deck-card is-coach" : "deck-card"}
                key={entry.player.id}
                style={
                  {
                    "--i": (index + 1) * DEPTH_PER_CARD,
                    "--x": across.toFixed(3),
                  } as React.CSSProperties
                }
              >
                <ShowcaseCard
                  player={entry.player}
                  coach={entry.coach}
                  onOpen={openCard}
                />
              </div>
            );
          }),
        )}
      </div>

      <PlayerDetailPanel
        player={opened?.player ?? null}
        coach={Boolean(opened?.coach)}
        onClose={closeCard}
      />
    </div>
  );
}
