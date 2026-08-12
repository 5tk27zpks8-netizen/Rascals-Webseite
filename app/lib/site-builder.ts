import { bindings, ensureCmsSchema } from "./cms";

export type BuilderSectionType = "hero" | "text" | "split" | "stats" | "cards" | "gallery" | "timeline" | "cta" | "spacer" | "games" | "news" | "sponsors";
export type BuilderAlign = "left" | "center" | "right";

export type BuilderItem = {
  id: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  text?: string;
  value?: string;
  image?: string;
  icon?: string;
  linkLabel?: string;
  linkUrl?: string;
};

export type BuilderSectionStyle = {
  background?: string;
  textColor?: string;
  accentColor?: string;
  paddingTop?: number;
  paddingBottom?: number;
  minHeight?: number;
  align?: BuilderAlign;
  maxWidth?: number;
  rounded?: number;
  border?: string;
};

export type BuilderSection = {
  id: string;
  type: BuilderSectionType;
  visible: boolean;
  eyebrow?: string;
  title?: string;
  accent?: string;
  text?: string;
  image?: string;
  image2?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  style: BuilderSectionStyle;
  items: BuilderItem[];
};

export type BuilderPage = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  showInNav: boolean;
  navLabel: string;
  title?: string;
  description?: string;
  sections: BuilderSection[];
};

export type BuilderTheme = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  headerBackground: string;
  headerText: string;
  contentWidth: number;
  radius: number;
};

export type SiteBuilderState = {
  version: number;
  theme: BuilderTheme;
  pages: BuilderPage[];
};

const icon = (name: string, color = "e7192d") => `https://api.iconify.design/${name.replace(":", "/")}.svg?color=%23${color}`;
const sid = (name: string) => `seed-${name}`;

export const defaultSiteBuilderState: SiteBuilderState = {
  version: 1,
  theme: {
    background: "#050d18",
    surface: "#0b1725",
    text: "#ffffff",
    muted: "#9aa7b7",
    accent: "#e7192d",
    headerBackground: "#050d18",
    headerText: "#ffffff",
    contentWidth: 1600,
    radius: 0,
  },
  pages: [
    { id: "page-home", name: "Startseite", slug: "", enabled: false, showInNav: false, navLabel: "Startseite", sections: [] },
    { id: "page-about", name: "Über uns", slug: "ueber-uns", enabled: false, showInNav: true, navLabel: "Über uns", sections: [
      { id: sid("about-hero"), type: "hero", visible: true, eyebrow: "ÜBER UNS", title: "HELLENSTEIN", accent: "RASCALS", text: "Ein Team. Eine Stadt. Eine Mission.", image: "/helmet-hero-4k.webp", buttonLabel: "", buttonUrl: "", style: { background: "#050d18", textColor: "#fff", accentColor: "#e7192d", paddingTop: 80, paddingBottom: 80, minHeight: 520, align: "left", maxWidth: 1600 }, items: [] },
      { id: sid("about-timeline"), type: "timeline", visible: true, eyebrow: "UNSERE REISE.", title: "FROM FIRST SNAP TO NEXT LEVEL.", style: { background: "#030a13", textColor: "#fff", accentColor: "#e7192d", paddingTop: 70, paddingBottom: 80, align: "center", maxWidth: 1600 }, items: [
        { id: "2023", title: "2023", subtitle: "KICKOFF · AUFBAULIGA", text: "Gründung der Hellenstein Rascals. Der erste Schritt auf unserem Weg.", icon: icon("mdi:whistle-outline") },
        { id: "2025", title: "2025", subtitle: "NEXT DOWN · KREISLIGA", value: "139 : 137", text: "Viele Spiele, viele Lektionen und ein Team, das zusammen gewachsen ist.", icon: icon("ion:american-football-outline") },
        { id: "2026", title: "2026", subtitle: "MOVING THE CHAINS · KREISOBERLIGA", value: "170 : 66", text: "Mehr Erfahrung, mehr Wille, mehr Team. Der verdiente Aufstieg in die Kreisoberliga.", icon: icon("streamline-ultimate:american-football-helmet") },
        { id: "2027", title: "2027", subtitle: "NEXT LEVEL · BEZIRKSLIGA", text: "Unser nächstes Ziel: die Bezirksliga. Wir arbeiten. Wir glauben. Wir werden bereit sein.", icon: icon("mdi:trophy-outline") },
      ] },
    ] },
    { id: "page-team", name: "Team", slug: "team", enabled: false, showInNav: true, navLabel: "Team", sections: [] },
    { id: "page-sponsoring", name: "Sponsoring", slug: "sponsoring", enabled: false, showInNav: true, navLabel: "Sponsoring", sections: [] },
    { id: "page-shop", name: "Shop", slug: "shop", enabled: false, showInNav: true, navLabel: "Shop", sections: [] },
    { id: "page-news", name: "News", slug: "news", enabled: false, showInNav: true, navLabel: "News", sections: [] },
    { id: "page-gallery", name: "Galerie", slug: "galerie", enabled: false, showInNav: true, navLabel: "Galerie", sections: [] },
  ],
};

function cleanSlug(value: string) {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9äöüß-]+/g, "-").replace(/-+/g, "-");
}

function normalizeSection(section: Partial<BuilderSection>): BuilderSection {
  const style = section.style ?? {};
  return {
    id: section.id || crypto.randomUUID(),
    type: section.type || "text",
    visible: section.visible !== false,
    eyebrow: section.eyebrow ?? "",
    title: section.title ?? "",
    accent: section.accent ?? "",
    text: section.text ?? "",
    image: section.image ?? "",
    image2: section.image2 ?? "",
    buttonLabel: section.buttonLabel ?? "",
    buttonUrl: section.buttonUrl ?? "",
    style: {
      background: style.background || "#050d18",
      textColor: style.textColor || "#ffffff",
      accentColor: style.accentColor || "#e7192d",
      paddingTop: Math.max(0, Number(style.paddingTop) || 64),
      paddingBottom: Math.max(0, Number(style.paddingBottom) || 64),
      minHeight: Math.max(0, Number(style.minHeight) || 0),
      align: style.align === "center" || style.align === "right" ? style.align : "left",
      maxWidth: Math.max(320, Number(style.maxWidth) || 1600),
      rounded: Math.max(0, Number(style.rounded) || 0),
      border: style.border || "",
    },
    items: Array.isArray(section.items) ? section.items.map((item) => ({ id: item.id || crypto.randomUUID(), ...item })) : [],
  };
}

function normalizeState(input: Partial<SiteBuilderState>): SiteBuilderState {
  const theme = { ...defaultSiteBuilderState.theme, ...(input.theme ?? {}) };
  const pages = Array.isArray(input.pages) ? input.pages.map((page) => ({
    id: page.id || crypto.randomUUID(),
    name: page.name || "Neue Seite",
    slug: cleanSlug(page.slug || ""),
    enabled: page.enabled === true,
    showInNav: page.showInNav === true,
    navLabel: page.navLabel || page.name || "Seite",
    title: page.title || "",
    description: page.description || "",
    sections: Array.isArray(page.sections) ? page.sections.map(normalizeSection) : [],
  })) : defaultSiteBuilderState.pages;
  return { version: 1, theme, pages };
}

export async function readSiteBuilderState(): Promise<SiteBuilderState> {
  await ensureCmsSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT value FROM cms_settings WHERE key = ?").bind("site_builder").first<{ value: string }>();
  if (!row) return defaultSiteBuilderState;
  try { return normalizeState(JSON.parse(row.value) as SiteBuilderState); } catch { return defaultSiteBuilderState; }
}

export async function writeSiteBuilderState(state: SiteBuilderState) {
  await ensureCmsSchema();
  const normalized = normalizeState(state);
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO cms_settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind("site_builder", JSON.stringify(normalized)).run();
}

export function findBuilderPage(state: SiteBuilderState, slug: string) {
  const normalized = cleanSlug(slug);
  return state.pages.find((page) => page.slug === normalized);
}
