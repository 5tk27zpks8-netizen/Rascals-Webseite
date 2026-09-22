/**
 * A phone-sized source for the site's 4K artwork.
 *
 * These photographs are 3840 across. A phone shows the largest of them at 421
 * CSS pixels, which even at three device pixels to one is 1263 — so the file
 * a phone downloads is three to thirteen times wider than the screen it lands
 * on, and the home page came to sixteen megabytes over mobile data.
 *
 * Every `-4k.webp` has a `-1280.webp` beside it, generated from the same
 * original. The name is the only thing needed to find it, so nothing has to
 * be stored, configured or kept in step — and an image without the sibling
 * simply gets no srcset and behaves exactly as it did.
 *
 * `sizes` defaults to 100vw, which is honest for the full-bleed uses and
 * harmlessly generous for the rest: on a phone it still resolves to the 1280,
 * and on a desktop still to the 4K.
 */
export function wide(src?: string | null): { srcSet?: string; sizes?: string } {
  if (!src || !src.includes("-4k.webp")) return {};
  return {
    srcSet: `${src.replace("-4k.webp", "-1280.webp")} 1280w, ${src} 3840w`,
    sizes: "100vw",
  };
}
