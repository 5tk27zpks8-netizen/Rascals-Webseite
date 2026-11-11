/**
 * PRODUKTE AUS DEM SHOPIFY-SHOP.
 *
 * Auf der Webseite standen drei fest verdrahtete Kacheln: ein Hoodie, ein
 * Preis von 25,00 €, ein Link auf /products/puli. Ändert sich im Shop der
 * Preis oder verschwindet der Artikel, widerspricht die Webseite dem Shop,
 * ohne dass es jemandem auffällt. Jetzt kommen die Daten von dort, wo sie
 * gepflegt werden.
 *
 * OHNE ZUGANGSSCHLÜSSEL.
 *
 * Jeder Shopify-Shop liefert seine veröffentlichten Artikel unter
 * /products.json aus — das ist ein offener Endpunkt, keine App, kein Token,
 * nichts einzurichten. Die Storefront-API könnte mehr, verlangt aber einen
 * Schlüssel, der dann wieder irgendwo abgelegt und erneuert werden müsste.
 * Für drei Kacheln auf einer Startseite steht das in keinem Verhältnis.
 *
 * JEDER FEHLER ENDET IN EINER LEEREN LISTE.
 *
 * Shop nicht erreichbar, Passwortschutz aktiv, Antwort kein JSON, Felder
 * anders benannt: in allen Fällen kommt [] zurück und die Seite zeigt ihre
 * bisherigen Kacheln. Eine Webseite, die wegen eines fremden Servers eine
 * Fehlerseite zeigt, wäre schlimmer als eine mit allgemeinen Bildern.
 */

export type ShopProduct = {
  title: string;
  url: string;
  image: string | null;
  price: string | null;
};

type RawVariant = { price?: string | number; available?: boolean };
type RawImage = { src?: string };
type RawProduct = {
  title?: string;
  handle?: string;
  variants?: RawVariant[];
  images?: RawImage[];
};

const PREIS = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

/** Preis als Zahl, egal ob Shopify ihn als "25.00" oder als 25 liefert. */
function parsePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Der günstigste Preis des Artikels, also der, den "ab X €" meint.
 * Shopify sortiert die Varianten nicht nach Preis, darum das Minimum.
 */
function lowestPrice(variants: RawVariant[] | undefined): string | null {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  let min: number | null = null;
  for (const variant of variants) {
    const value = parsePrice(variant?.price);
    if (value === null) continue;
    if (min === null || value < min) min = value;
  }
  return min === null ? null : PREIS.format(min);
}

function toProduct(raw: RawProduct, shopUrl: string): ShopProduct | null {
  const title = typeof raw?.title === "string" ? raw.title.trim() : "";
  const handle = typeof raw?.handle === "string" ? raw.handle.trim() : "";
  if (!title || !handle) return null;

  const firstImage = Array.isArray(raw.images) ? raw.images.find(image => typeof image?.src === "string") : undefined;

  return {
    title,
    url: `${shopUrl}/products/${handle}`,
    image: firstImage?.src ?? null,
    price: lowestPrice(raw.variants),
  };
}

/**
 * Die zuletzt angelegten Artikel des Shops.
 *
 * Zwischengespeichert, damit nicht jeder Seitenaufruf den Shop anfragt. Eine
 * Viertelstunde ist lang genug, dass es praktisch nie passiert, und kurz
 * genug, dass ein neuer Artikel am selben Tag erscheint.
 */
export async function readShopProducts(shopUrl: string, limit = 3): Promise<ShopProduct[]> {
  const base = shopUrl.replace(/\/+$/, "");
  if (!/^https:\/\//.test(base)) return [];

  try {
    const response = await fetch(`${base}/products.json?limit=${Math.min(Math.max(limit, 1), 20)}`, {
      headers: { accept: "application/json" },
      // Ohne Zeitgrenze haengt die eigene Seite an der Antwortzeit eines
      // fremden Servers. Lieber die bisherigen Bilder zeigen als warten.
      signal: AbortSignal.timeout(2500),
      // Cloudflare-eigene Zwischenspeicherung; der Typ kennt das Feld nicht.
      cf: { cacheTtl: 900, cacheEverything: true },
    } as RequestInit);

    if (!response.ok) return [];

    const data = (await response.json()) as { products?: unknown };
    if (!Array.isArray(data?.products)) return [];

    const products: ShopProduct[] = [];
    for (const raw of data.products) {
      const product = toProduct(raw as RawProduct, base);
      if (product) products.push(product);
      if (products.length >= limit) break;
    }
    return products;
  } catch (error) {
    console.error("shop products unavailable", error);
    return [];
  }
}
