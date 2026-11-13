/**
 * THE CLUB'S MARK HAS ONE SOURCE.
 *
 * It is set once, in the CMS, and the start page has always read it from
 * there. Every other page did not: the shell those pages share had the file
 * name written into it, so a mark changed in the CMS appeared on the start
 * page and nowhere else. Two logos on one site, and no way to tell from the
 * editor that it had happened.
 *
 * This half holds only the shape and the fallback, because the header that
 * uses them runs in the browser. Reading the CMS is the other half, in
 * brand-server, and it must stay there: pulling it in here would drag the
 * database binding into the client bundle, which does not build.
 */
export type SiteBrand = { logo: string; top: string; bottom: string };

export const DEFAULT_BRAND: SiteBrand = {
  logo: "/rascals-logo-768.webp",
  top: "HELLENSTEIN",
  bottom: "RASCALS",
};

/** The CMS theme's three brand fields, with the old hard-coded values as the floor. */
export function brandFromTheme(theme: { logoUrl?: string; brandTop?: string; brandBottom?: string }): SiteBrand {
  return {
    logo: theme.logoUrl?.trim() || DEFAULT_BRAND.logo,
    top: theme.brandTop?.trim() || DEFAULT_BRAND.top,
    bottom: theme.brandBottom?.trim() || DEFAULT_BRAND.bottom,
  };
}
