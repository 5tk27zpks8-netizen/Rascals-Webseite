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

export function canDrive(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return window.matchMedia(DRIVE_MEDIA).matches;
}
