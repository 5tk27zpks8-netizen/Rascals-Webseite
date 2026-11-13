"use client";

import { useEffect } from "react";
import { canDrive } from "./lib/drive-mode";
import { subscribeDrive } from "./lib/drive-scroll";

/**
 * THE LAST CARD IS NOT THE END OF THE WORK.
 *
 * The formation only uses the first four fifths of the deck's scroll (see
 * FORMATION_SPAN in PlayerDeck). The fifth that is left over is on purpose:
 * it is where the squad clears out, the stadium opens, the ball comes down
 * and the call arrives in the air over the end stand. It is the payoff the
 * whole page is built towards.
 *
 * On a seventy-card roster that fifth is about three and a half thousand
 * pixels, and nobody scrolls three and a half thousand pixels through an
 * empty field to find out whether anything is at the other end. The payoff
 * was there the whole time; it was just posted behind four more screens of
 * wheel.
 *
 * So the page closes that gap itself. The moment the last card goes past,
 * the end zone takes hold and draws the reader the rest of the way.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS NOT A SMOOTH SCROLL, AND NOT A SNAP POINT
 *
 * It was both, in that order, and neither survived.
 *
 * `scrollIntoView({ behavior: "smooth" })` hands the browser an animation it
 * abandons the instant anything else touches the scroll — which on a page
 * read with a wheel is immediately. It is specified that way. The pull would
 * start, the next notch would kill it, and the reader was left exactly where
 * they had been dropped.
 *
 * A CSS snap point cannot be starved like that, but it is short range by
 * construction: `proximity` brings a scroll to rest against a nearby edge.
 * It will not carry anybody four screens. That is not what it is for.
 *
 * What is left is to move the scroll by hand, one position per frame, with
 * the easing written out. A per-frame `scrollTo` is not an animation the
 * browser owns, so there is nothing for it to abandon — and because it runs
 * inside the drive's existing frame, it cannot fall behind the camera it is
 * supposed to be flying.
 *
 * ---------------------------------------------------------------------
 * AND IT LETS GO
 *
 * Taking the scroll out of somebody's hands is the rudest thing a page can
 * do, so it is fenced:
 *
 *   · only in drive mode — a wide screen, a real pointer, motion wanted. On
 *     a phone the deck is a plain list with no empty fifth to cross, and a
 *     finger fighting a programmed scroll is a page that feels broken;
 *   · only travelling down, and only once per approach;
 *   · a wheel turned back, a finger, a key or a drag on the scrollbar ends
 *     it on the spot, wherever it has got to. It does not resist and it does
 *     not restart;
 *   · and it only offers again after the reader has gone back a full screen
 *     behind the hand-over, so leaving the end zone is never a fight.
 */

/** Where the formation ends. The same fraction PlayerDeck lays the cards out over. */
const FORMATION_SPAN = 0.8;

/** Milliseconds of pull per pixel of gap, within these bounds. */
const PACE = 0.42;
const SHORTEST = 700;
const LONGEST = 1800;

/** Below this there is nothing worth taking anybody's scroll away for. */
const WORTH_IT = 240;

export function EndzonePull() {
  useEffect(() => {
    if (!canDrive()) return;

    /** Mid-pull: when it started, where from, where to, how long for. */
    let pull: { at: number; from: number; to: number; ms: number } | null = null;
    /** Already offered on this approach; cleared by going back up a screen. */
    let spent = false;

    const stop = () => {
      pull = null;
      spent = true;
    };

    /* Only a wheel turned against the pull counts. Turning it the same way is
       not a disagreement — it is the reader asking for exactly what is already
       happening, and cancelling on it would mean the pull almost never ran,
       since it is a downward wheel that sets it off in the first place. */
    const onWheel = (event: WheelEvent) => {
      if (pull && event.deltaY < 0) stop();
    };
    const onKey = (event: KeyboardEvent) => {
      if (pull && event.key !== "Tab") stop();
    };
    const onHand = () => {
      if (pull) stop();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onHand, { passive: true });
    window.addEventListener("pointerdown", onHand, { passive: true });

    const unsubscribe = subscribeDrive((drive) => {
      if (pull) {
        /* Smoothstep rather than an exponential ease. An exponential starts at
           its fastest, which from a standing start reads as a shove; this one
           leans in, carries, and sets down — which is what being drawn
           somewhere feels like. */
        const t = Math.min(1, (performance.now() - pull.at) / pull.ms);
        const eased = t * t * (3 - 2 * t);
        window.scrollTo(0, Math.round(pull.from + (pull.to - pull.from) * eased));
        if (t >= 1) pull = null;
        return;
      }

      /* The visible deck. There is one panel per unit and the others are
         display:none, which is what offsetParent answers for. Measured every
         frame rather than once, because switching unit swaps a seventy-card
         deck for a six-card one and every number below moves with it. */
      let deck: HTMLElement | null = null;
      for (const node of document.querySelectorAll<HTMLElement>(".deck.is-deck")) {
        if (node.offsetParent !== null) {
          deck = node;
          break;
        }
      }
      if (!deck) return;

      const runway = deck.offsetHeight - window.innerHeight;
      if (runway <= 0) return;

      const deckTop = deck.getBoundingClientRect().top + drive.rawScroll;
      const handover = deckTop + runway * FORMATION_SPAN;

      /* Back behind the hand-over by a screen: whatever happened last time is
         forgotten and the end zone may take hold again. */
      if (drive.rawScroll < handover - window.innerHeight) {
        spent = false;
        return;
      }
      if (spent || drive.rawScroll < handover) return;

      const bottom = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const gap = bottom - drive.rawScroll;
      spent = true;
      if (gap < WORTH_IT) return;

      pull = {
        at: performance.now(),
        from: drive.rawScroll,
        to: bottom,
        ms: Math.min(LONGEST, Math.max(SHORTEST, gap * PACE)),
      };
    });

    return () => {
      unsubscribe();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onHand);
      window.removeEventListener("pointerdown", onHand);
    };
  }, []);

  return null;
}
