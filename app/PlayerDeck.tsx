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
 * A scroll frame touches only the handful of cards actually in frame: their
 * transform and opacity are written straight onto them, and everything else is
 * taken out of the document with display:none. No React render is involved at
 * any point.
 *
 * It used to be one custom property instead — `--focus` — with the cards
 * deriving their own transforms from it in CSS. That reads better and is three
 * to six times too slow: one write to an inherited property invalidates all
 * seventy-two cards, and re-resolving their calc chains measured 57 to 99ms
 * against a 16.7ms budget. Eight direct writes beat one elegant one.
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
 * never arrives, nothing is ever written, and the same markup is a plain
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
 * THE GEOMETRY OF A PASS-BY, AND WHY IT IS SHAPED LIKE THIS.
 *
 * The formation used to dissolve cards in the middle of the screen. Measured,
 * that produced a sawtooth: the dominant card grew as it came in, vanished,
 * and was replaced — at the same place on screen — by one a card-length
 * further away and therefore smaller. Thirteen to thirty pixels smaller, once
 * per card, seventy-two times down the page.
 *
 * Something shrinking where something bigger just was is not read as a
 * handover. It is read as the world jumping backwards, and that is exactly
 * what it was reported as: constant back-and-forth, like a fault.
 *
 * The fix is not to flatten the sizes — that was tried, and it freezes the
 * near field into a slideshow. It is to stop anything ever shrinking in place:
 *
 *   A card holds near the centre while it is far off and readable, then slides
 *   sideways out of frame as it reaches the camera, growing the whole way. The
 *   centre it vacates is taken by the next card, which arrives at the same
 *   distance and therefore the same size.
 *
 * So the middle of the screen always holds a card of the same size, every card
 * only ever grows, and nothing is ever replaced by something smaller. The
 * motion the eye follows is a card passing you, which is what it is.
 */

/** Depth between consecutive cards, in CSS pixels of translateZ. */
const DEPTH_STEP = 230;

/** How far a card is thrown sideways by the time it reaches the camera. */
const EXIT_X = 950;

/** How sharply that sideways move happens. Higher holds the centre longer. */
const EXIT_CURVE = 1.7;

/** The lateral spread of the column itself, so it is not single file. */
const COLUMN_X = 96;

/** Where a card is at its most readable — far enough to be whole, near enough to read. */
const FOCAL_REL = 1;

/** Fades: in from the far end, and out only once it is leaving the frame anyway. */
const FADE_IN_FAR = 5.6;
const FADE_IN_NEAR = 4;
const FADE_OUT = 0.24;

/** Rendered at all. Anything outside is display:none and costs nothing. */
const RENDER_FAR = 6.2;
const RENDER_NEAR = -0.15;

/** Takes clicks. Excludes the one sweeping out of frame past the lens. */
const LIVE_NEAR = 0.34;
const LIVE_FAR = 5;

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

    /* Every card's fixed facts, worked out once.

       The per-frame job is then pure arithmetic over this array: no DOM
       queries, no reading back styles, no allocation. */
    const cards = [...element.querySelectorAll<HTMLElement>(".deck-card")].map((node) => {
      const depth = Math.round(Number(node.dataset.depth) || 0);
      return {
        node,
        depth,
        /* Which way it leaves. Alternating, so the picture does not drift to
           one side, with the pair-wise swap breaking the strict left-right-
           left metronome that would otherwise be audible. */
        side: depth % 4 === 0 || depth % 4 === 1 ? -1 : 1,
        lane: Number(node.dataset.lane) || 0,
        /* Not `false`. The first frame has to be allowed to write, and it only
           writes on a change — so starting at a value the card might legally
           compute means the write is skipped and the card keeps whatever the
           stylesheet gave it. Starting from "not yet known" makes the first
           frame unconditional, which is what it has to be. */
        shown: null as boolean | null,
        live: false,
      };
    });

    /* The perspective the stage actually has, read once rather than duplicated
       as a number in two files that can drift apart. Screen offsets are
       divided by the projection factor so the maths below is in screen pixels
       — where the frame edge is — rather than in local space, where "off the
       side of the screen" depends on how far away the card happens to be. */
    const stage = element.querySelector<HTMLElement>(".deck-stage");
    const perspective =
      Number.parseFloat(getComputedStyle(stage ?? element).perspective) || 1150;

    const unsubscribe = subscribeDrive((drive) => {
      if (element.offsetParent === null) return;

      const box = element.getBoundingClientRect();
      const runway = element.offsetHeight - window.innerHeight;
      if (runway <= 0) return;

      const deckTop = box.top + drive.rawScroll;
      const travelled = (drive.scroll - deckTop) / runway / FORMATION_SPAN;
      const focus = Math.min(1, Math.max(0, travelled)) * depthSpan;

      for (const card of cards) {
        const rel = card.depth - focus;

        /* Out of range: taken out of the document entirely. This is the
           performance half of the rewrite. Measured on this page, a scroll
           frame that restyles all seventy-two cards costs 57 to 99ms of style
           recalculation — three to six times the whole 60fps budget, on the
           CPU, before anything is drawn. The same frame with eight costs 8ms.
           Depth is what decides which eight, so the rest are display:none and
           the engine never looks at them. */
        const shown = rel < RENDER_FAR && rel > RENDER_NEAR;
        if (shown !== card.shown) {
          card.node.style.display = shown ? "" : "none";
          card.shown = shown;
        }
        if (!shown) continue;

        const depthPx = rel * DEPTH_STEP;
        // How much the projection shrinks something at this depth.
        const projection = perspective / (perspective + depthPx);

        /* The sideways sweep, in screen pixels, then converted back into the
           card's own space. Nothing until it is nearer than the focal
           distance; from there it accelerates out of frame. */
        const approach = Math.max(0, FOCAL_REL - rel);
        const screenX =
          card.side * (COLUMN_X * card.lane + EXIT_X * Math.pow(approach, EXIT_CURVE));
        const localX = screenX / projection;

        /* A touch of turn as it goes by, so the card shows its edge rather
           than staying a flat plate facing the lens all the way past. */
        const turn = card.side * Math.min(18, approach * 17);

        const fadeIn =
          rel >= FADE_IN_FAR
            ? 0
            : rel <= FADE_IN_NEAR
              ? 1
              : (FADE_IN_FAR - rel) / (FADE_IN_FAR - FADE_IN_NEAR);
        const fadeOut = rel <= 0 ? 0 : rel >= FADE_OUT ? 1 : rel / FADE_OUT;
        const opacity = Math.min(fadeIn, fadeOut);

        card.node.style.transform =
          `translate3d(${localX.toFixed(1)}px,0,${(-depthPx).toFixed(1)}px) rotateY(${turn.toFixed(2)}deg)`;
        card.node.style.opacity = opacity.toFixed(3);
        card.node.style.zIndex = String(1000 - card.depth);

        /* Clickable while it is a thing you would aim at: not the one sweeping
           across the lens, not the ones too small and overlapped to hit. */
        const live = rel >= LIVE_NEAR && rel <= LIVE_FAR;
        if (live !== card.live) {
          card.node.classList.toggle("is-live", live);
          card.live = live;
        }
      }
    });

    return () => {
      unsubscribe();
      element.classList.remove("is-deck");
      /* Everything this effect wrote, taken back off — so the markup returns
         to the plain swipeable row it is without JavaScript. */
      for (const card of cards) {
        card.node.classList.remove("is-live");
        card.node.style.removeProperty("display");
        card.node.style.removeProperty("transform");
        card.node.style.removeProperty("opacity");
        card.node.style.removeProperty("z-index");
      }
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
                data-depth={index + 1}
                data-lane={across.toFixed(3)}
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
