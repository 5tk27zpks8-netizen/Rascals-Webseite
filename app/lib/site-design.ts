import { bindings, ensureCmsSchema } from "./cms";

/**
 * Which complete design the public site is built from.
 *
 * The design presets under /admin/designs recolour the CMS builder, which is
 * why they all look alike: same structure, different palette. This is the
 * other axis — it swaps the whole homepage, layout and motion included, so
 * the four options are genuinely different sites rather than four themes.
 */
export type SiteDesignId = "classic" | "matchday" | "arena" | "hybrid";

export type SiteDesign = {
  id: SiteDesignId;
  name: string;
  tagline: string;
  description: string;
  /** What actually differs, for the picker — not marketing copy. */
  traits: string[];
  /** Preview address, so a design can be looked at before it goes live. */
  preview: string;
  /** Palette swatches shown on the card. */
  palette: string[];
  /** True when the design runs a WebGL scene, which the picker warns about. */
  webgl?: boolean;
};

export const SITE_DESIGNS: SiteDesign[] = [
  {
    id: "classic",
    name: "Klassik",
    tagline: "Stadion bei Nacht",
    description:
      "Dunkles Navy, Vollbild-Fotografie, der Helm als Aufmacher. Der Aufbau, der aktuell live ist: Hero, Zahlen, Spielplan, Teams, Verein, News, Mitmachen.",
    traits: ["Foto-Aufmacher", "Dunkle Grundfarbe", "Vertraute Struktur"],
    preview: "/",
    palette: ["#07172b", "#e7192d", "#f2f3ef", "#ffffff"],
  },
  {
    id: "matchday",
    name: "Matchday",
    tagline: "Programmheft",
    description:
      "Heller Papiergrund, monumentale Typografie, das nächste Spiel als Aufmacher statt eines Fotos. Abschnitte sind wie Drives nummeriert und durch Yardlinien getrennt.",
    traits: ["Nächstes Spiel zuerst", "Heller Grund", "Typografie statt Bild"],
    preview: "/neu",
    palette: ["#f4f2ec", "#0a1626", "#e7192d", "#e9e6dd"],
  },
  {
    id: "arena",
    name: "Arena 3D",
    tagline: "Flutlicht und Tiefe",
    description:
      "Eine räumliche Szene als Aufmacher: das Feld in Perspektive, der Schriftzug als Körper, Flutlicht und Staub. Reagiert auf Maus und Scrollen.",
    traits: ["Echte 3D-Szene", "Bewegung im Aufmacher", "Am dunkelsten"],
    preview: "/arena",
    palette: ["#03070f", "#e7192d", "#3fa9ff", "#f2f3ef"],
    webgl: true,
  },
  {
    id: "hybrid",
    name: "Hybrid",
    tagline: "Ruhig mit Tiefe",
    description:
      "Der schlichte Aufbau, aber mit räumlicher Wirkung: gestaffelte Ebenen, Karten die auf Mausbewegung kippen, Tiefe ohne 3D-Szene.",
    traits: ["Schlicht im Aufbau", "Tiefe ohne WebGL", "Leicht auf dem Handy"],
    preview: "/hybrid",
    palette: ["#0b1524", "#e7192d", "#dfe4ea", "#ffffff"],
  },
];

const SETTING_KEY = "site_design";
const DEFAULT_DESIGN: SiteDesignId = "classic";

function isDesignId(value: unknown): value is SiteDesignId {
  return typeof value === "string" && SITE_DESIGNS.some((design) => design.id === value);
}

export async function readSiteDesign(): Promise<SiteDesignId> {
  await ensureCmsSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT value FROM cms_settings WHERE key = ?").bind(SETTING_KEY).first<{ value: string }>();
  return isDesignId(row?.value) ? row.value : DEFAULT_DESIGN;
}

export async function writeSiteDesign(value: unknown): Promise<SiteDesignId> {
  if (!isDesignId(value)) throw new Error("UNKNOWN_DESIGN");
  await ensureCmsSchema();
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO cms_settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`)
    .bind(SETTING_KEY, value).run();
  return value;
}

export function findSiteDesign(id: SiteDesignId): SiteDesign {
  return SITE_DESIGNS.find((design) => design.id === id) ?? SITE_DESIGNS[0];
}
