/**
 * A phone-sized source for the site's 4K artwork, and a loading policy to go
 * with it.
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
 *
 * ---------------------------------------------------------------------
 * WHEN, NOT ONLY HOW BIG
 *
 * Measured against the built worker rather than the dev server — the dev
 * server ships a hundred and twenty-nine unbundled modules and an error
 * overlay, which drowns out everything else and makes its numbers useless for
 * this — the home page fetched 1937 KB over 49 requests, and the framework had
 * emitted a `<link rel=preload as=image>` for every photograph on it. Preload
 * means "fetch this now, at high priority". For a picture six screens down
 * that is precisely wrong: it competes with the one thing the visitor can
 * actually see.
 *
 * So the default here is lazy. A browser still loads what is near the viewport
 * early enough that scrolling shows no gap, and a lazy image is not preloaded,
 * so the priority fight goes away with it.
 *
 * The exception is the picture at the top, which is usually the largest thing
 * on screen and the one the page is measured by. It asks to be fetched first
 * and says so — `eager` plus a high priority — because it is the content, not
 * an illustration of it.
 */
type WideProps = {
  srcSet?: string;
  sizes?: string;
  loading: "lazy" | "eager";
  decoding: "async";
  fetchPriority?: "high";
};

export function wide(src?: string | null, options?: { eager?: boolean }): WideProps {
  const eager = options?.eager === true;
  const base: WideProps = eager
    ? { loading: "eager", decoding: "async", fetchPriority: "high" }
    : { loading: "lazy", decoding: "async" };
  if (!src || !src.includes("-4k.webp")) return base;
  return {
    ...base,
    srcSet: `${src.replace("-4k.webp", "-1280.webp")} 1280w, ${src} 3840w`,
    sizes: "100vw",
  };
}
