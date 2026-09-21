"use client";

import type { Player } from "../lib/football";

/**
 * One player, as a card in the fly-through.
 *
 * Deliberately not the team page's `RascalsPlayerCard`. That one is an anchor
 * wrapping a layout built for a static grid at a comfortable reading size, and
 * it is used on /team where it works. Here the card has a different job: it is
 * a thing that flies past at an angle, has to be legible for the second or two
 * it is at the front, and has to open a panel rather than navigate away.
 *
 * Reusing the grid card meant a link — so a click left the presentation
 * entirely — and a layout that had to be overridden piece by piece from the
 * deck's stylesheet to survive at this size. Two components with two jobs is
 * less code than one component with a pile of contextual overrides, and it
 * leaves /team untouched.
 *
 * ---------------------------------------------------------------------
 * A BUTTON, AND IT MATTERS
 *
 * It opens an overlay in place; it does not go anywhere. That is a button, and
 * being a real one is what brings keyboard focus, Enter and Space, and the
 * announcement that this is something that acts rather than something that
 * navigates — none of which a div with a click handler has.
 */
export function ShowcaseCard({
  player,
  coach = false,
  onOpen,
}: {
  player: Player;
  coach?: boolean;
  onOpen: (player: Player) => void;
}) {
  const fullName = `${player.firstName} ${player.lastName}`.trim();
  const number = player.jerseyNumber;
  /* Long names have to shrink or they break mid-word at this width, and a name
     hyphenated across two lines reads as a rendering fault rather than as a
     name. Three steps rather than a continuous scale: a card whose type size
     drifts card to card looks accidental. */
  const nameLength = fullName.length;
  const nameSize = nameLength > 19 ? "is-name-s" : nameLength > 14 ? "is-name-m" : "";

  return (
    <button
      type="button"
      className={`sc-card${coach ? " is-coach" : ""}`}
      onClick={() => onOpen(player)}
      aria-label={[fullName, player.position].filter(Boolean).join(", ") + ". Details öffnen"}
    >
      {/* The frame: a hairline plate with the corner cut taken out of it. */}
      <span className="sc-frame" aria-hidden="true" />

      {/* The shirt number, set as a watermark behind the portrait. On a card
          this size a number placed beside the name is a number nobody reads;
          behind it, it is the first thing the eye lands on. */}
      {number !== null && !coach ? (
        <span className="sc-watermark" aria-hidden="true">
          {number}
        </span>
      ) : null}

      <span className="sc-portrait">
        {player.portrait ? (
          <img
            src={player.portrait}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="sc-portrait-empty" aria-hidden="true">
            <img src="/rascals-logo-transparent-4k.png" alt="" />
          </span>
        )}
      </span>

      <span className="sc-body">
        <span className="sc-position">
          {coach ? player.position || "COACH" : player.position}
          {player.captain ? <b className="sc-tag">C</b> : null}
          {player.rookie && !player.captain ? <b className="sc-tag is-rookie">R</b> : null}
        </span>
        <span className={`sc-name ${nameSize}`.trim()}>
          <i>{player.firstName}</i>
          <em>{player.lastName}</em>
        </span>
      </span>

      {/* The affordance. Not a permanent button — a line that lights on hover
          and focus, so the card reads as inert until it is addressed. */}
      <span className="sc-open" aria-hidden="true">
        <span>DETAILS</span>
      </span>
    </button>
  );
}
