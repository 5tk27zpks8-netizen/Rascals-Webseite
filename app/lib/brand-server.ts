import { brandFromTheme, DEFAULT_BRAND, type SiteBrand } from "./brand";
import { readPublishedSiteBuilderState } from "./site-builder";

/**
 * The published mark, for the pages that do not build themselves from the
 * CMS. A page that cannot reach the database still draws a header rather
 * than failing, which is why this never throws.
 */
export async function siteBrand(): Promise<SiteBrand> {
  try {
    const { theme } = await readPublishedSiteBuilderState();
    return brandFromTheme(theme);
  } catch {
    return DEFAULT_BRAND;
  }
}
