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
