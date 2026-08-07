import { env } from "cloudflare:workers";

export type HeroButtonStyle = "red" | "ghost" | "light";
export type HeroTransition = "fade" | "slide" | "zoom" | "parallax";

export type HeroSlide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
  buttonStyle?: HeroButtonStyle;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  secondaryButtonStyle?: HeroButtonStyle;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type CmsState = {
  slides: HeroSlide[];
  intervalSeconds: number;
  transition: HeroTransition;
  shopUrl: string;
};

type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
};

export function bindings(): Bindings {
  return env as unknown as Bindings;
}

export const defaultCmsState: CmsState = {
  intervalSeconds: 7,
  transition: "fade",
  shopUrl: "https://hellenstein-rascals.myshopify.com",
  slides: [
    {
      id: "helmet",
      image: "/helmet-hero-4k.webp",
      eyebrow: "American Football · Heidenheim",
      title: "HART. ECHT.",
      accent: "RASCALS.",
      text: "Ein Team. Eine Familie. Bereit für den nächsten Snap.",
      buttonLabel: "Teil des Teams werden",
      buttonUrl: "mailto:football@hsb1846.de",
      buttonStyle: "red",
      secondaryButtonLabel: "Spielplan 2026",
      secondaryButtonUrl: "/#spielplan",
      secondaryButtonStyle: "ghost",
      active: true,
      startsAt: null,
      endsAt: null,
    },
    {
      id: "schedule",
      image: "/team-entry-4k.webp",
      eyebrow: "Kreisoberliga · Saison 2026",
      title: "GAME",
      accent: "SCHEDULE",
      text: "Alle bestätigten Termine, Gegner und Heimspiele auf einen Blick.",
      buttonLabel: "Zum Spielplan",
      buttonUrl: "/#spielplan",
      buttonStyle: "red",
      secondaryButtonLabel: "",
      secondaryButtonUrl: "",
      secondaryButtonStyle: "ghost",
      active: true,
      startsAt: null,
      endsAt: null,
    },
  ],
};

export async function ensureCmsSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS cms_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function normalizeState(value: CmsState): CmsState {
  const transitions: HeroTransition[] = ["fade", "slide", "zoom", "parallax"];
  return {
    ...defaultCmsState,
    ...value,
    transition: transitions.includes(value.transition) ? value.transition : "fade",
    slides: Array.isArray(value.slides) && value.slides.length
      ? value.slides.map((slide) => ({
          buttonStyle: "red",
          secondaryButtonLabel: "",
          secondaryButtonUrl: "",
          secondaryButtonStyle: "ghost",
          active: true,
          startsAt: null,
          endsAt: null,
          ...slide,
        }))
      : defaultCmsState.slides,
  };
}

export async function readCmsState(): Promise<CmsState> {
  await ensureCmsSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT value FROM cms_settings WHERE key = ?")
    .bind("site")
    .first<{ value: string }>();
  if (!row) return defaultCmsState;
  try {
    return normalizeState(JSON.parse(row.value) as CmsState);
  } catch {
    return defaultCmsState;
  }
}

export async function writeCmsState(state: CmsState) {
  await ensureCmsSchema();
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO cms_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`)
    .bind("site", JSON.stringify(normalizeState(state)))
    .run();
}
