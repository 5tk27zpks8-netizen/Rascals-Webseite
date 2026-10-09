import { useSyncExternalStore } from "react";

/**
 * Whether this device gets the scroll-driven stadium.
 *
 * It used to be decided twice, differently. The stadium asked for 1000px, a
 * hovering pointer and no reduced-motion preference; the card deck asked only
 * for 760px. Between the two answers lay a band — every tablet, every
 * touchscreen laptop, and any window between 760 and 1000 — where the deck
 * went into its drive-synchronised mode with no stadium behind it to
 * synchronise with, and the cards flew through an empty page.
 *
 * One predicate, one answer. The stylesheet asks the same question in its own
 * language (see DRIVE_MEDIA below), and the two have to be edited together.
 */
export const DRIVE_MEDIA = "(min-width: 1000px) and (hover: hover) and (pointer: fine)";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function canDrive(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  if (window.matchMedia(REDUCED_MOTION).matches) return false;
  return window.matchMedia(DRIVE_MEDIA).matches;
}

/**
 * The same answer, but live.
 *
 * Asking once on mount is not enough, because the answer changes under the
 * page: a tablet is turned, a window is dragged narrow, someone switches
 * reduced motion on in system settings. When it did change, nothing noticed —
 * the drive had already written `is-deck` and `is-driving` onto the page, and
 * those selectors outrank the narrow-screen stylesheet. A desktop window
 * pulled in past 1000px kept the flying formation and showed six cards out of
 * seventy-two, most of them off the side of the screen, with no way back short
 * of a reload.
 *
 * So the components subscribe instead. `useSyncExternalStore` is the right
 * shape for this: the store is the browser, the snapshot is one boolean, and
 * the server snapshot is `false` — which is also what the stylesheet renders
 * without JavaScript, so the first paint agrees with the markup either way.
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const queries = [window.matchMedia(DRIVE_MEDIA), window.matchMedia(REDUCED_MOTION)];
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

export function useDriveMode(): boolean {
  return useSyncExternalStore(subscribe, canDrive, () => false);
}

/* ------------------------------------------------------------------
   THE STADIUM IS A SEPARATE QUESTION FROM THE DRIVE.

   These were one answer for a long time and it was the right
   simplification while both meant the same thing: a wide screen with a
   mouse gets the scroll-driven camera, and the page around it lays
   itself out for a camera.

   They are not the same thing on a phone. The layout question — do the
   panels stand still while the ground travels under them — still has to
   be no: fixed panels need a screen to be fixed on, and the card deck
   flying in formation needs room to fly. But the other half, whether
   there is a stadium there at all, was being answered no for the same
   reason, and that is what left the Arena on a phone as a photograph
   with text over it. It is the one page whose whole point is the
   stadium.

   So the stadium now runs wherever motion is wanted at all, and the
   drive's layout stays where it was. On a phone that means the panels
   scroll as they already do, over a bowl that is live and moving with
   them rather than a still of one.

   `wantsLightStadium` is what makes that affordable. A phone is asked
   for fewer pixels, no multisampling and no occlusion pass — the three
   that cost the most and show the least at this size.
   ------------------------------------------------------------------ */
const STADIUM_MEDIA = "(min-width: 360px)";
const LIGHT_STADIUM = "(max-width: 999.98px), (pointer: coarse)";

export function stadiumAllowed(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  if (window.matchMedia(REDUCED_MOTION).matches) return false;
  return window.matchMedia(STADIUM_MEDIA).matches;
}

export function wantsLightStadium(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(LIGHT_STADIUM).matches;
}

function subscribeStadium(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const queries = [window.matchMedia(STADIUM_MEDIA), window.matchMedia(REDUCED_MOTION)];
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

export function useStadium(): boolean {
  return useSyncExternalStore(subscribeStadium, stadiumAllowed, () => false);
}
