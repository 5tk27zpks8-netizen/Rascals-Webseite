import type { BuilderPage, BuilderSection, BuilderSectionType, SiteBuilderState } from "./site-builder";

export type LayoutPresetId = "original" | "classic" | "performance" | "editorial";
export type LayoutPreset = {
  id: LayoutPresetId;
  name: string;
  description: string;
  eyebrow: string;
  order: BuilderSectionType[];
  variants: Partial<Record<BuilderSectionType, string>>;
};

export const layoutPresets: LayoutPreset[] = [
  {
    id: "original",
    name: "Standard",
    eyebrow: "RASCALS ORIGINAL",
    description: "Der bestehende Rascals-Aufbau bleibt als geschützter Ausgangspunkt erhalten.",
    order: [],
    variants: {},
  },
  {
    id: "classic",
    name: "Klassik",
    eyebrow: "CLASSIC CLUB WEBSITE",
    description: "Klassische Vereinswebsite mit klarer Navigation, ruhigem Hero, Vereinsgeschichte, Spielplan, News und Partnern.",
    order: ["hero", "split", "text", "games", "stats", "cards", "news", "gallery", "sponsors", "cta", "timeline"],
    variants: { hero: "split", split: "image-right", text: "default", games: "clean", stats: "strip", cards: "compact", news: "clean", gallery: "grid", sponsors: "clean", cta: "default", timeline: "compact" },
  },
  {
    id: "performance",
    name: "Performance",
    eyebrow: "PRO TEAM EXPERIENCE",
    description: "Komplett anderer Pro-Team-Aufbau: Performance-KPIs, Game Center und starke Bildflächen dominieren die Seite.",
    order: ["hero", "stats", "games", "cards", "gallery", "split", "timeline", "cta", "news", "sponsors", "text"],
    variants: { hero: "centered", stats: "bold", games: "scoreboard", cards: "bold", gallery: "cinematic", split: "image-left", timeline: "vertical", cta: "banner", news: "clean", sponsors: "ticker", text: "centered" },
  },
  {
    id: "editorial",
    name: "Editorial",
    eyebrow: "SPORTS MAGAZINE",
    description: "Magazinartige Website: Stories und News führen, große Editorial-Flächen ersetzen den klassischen Vereinsseiten-Aufbau.",
    order: ["news", "hero", "split", "gallery", "games", "text", "stats", "timeline", "cards", "sponsors", "cta"],
    variants: { news: "editorial", hero: "minimal", split: "editorial", gallery: "masonry", games: "clean", text: "editorial", stats: "cards", timeline: "compact", cards: "editorial", sponsors: "clean", cta: "panel" },
  },
];

function reorderSections(sections: BuilderSection[], preset: LayoutPreset): BuilderSection[] {
  if (preset.id === "original") return sections.map(section => ({ ...section }));
  const used = new Set<string>();
  const ordered: BuilderSection[] = [];
  for (const type of preset.order) {
    for (const section of sections) {
      if (used.has(section.id) || section.type !== type) continue;
      used.add(section.id);
      ordered.push({ ...section, variant: preset.variants[section.type] || section.variant });
    }
  }
  for (const section of sections) {
    if (used.has(section.id)) continue;
    ordered.push({ ...section, variant: preset.variants[section.type] || section.variant });
  }
  return ordered;
}

export function applyLayoutPreset(state: SiteBuilderState, pageId: string, preset: LayoutPreset): SiteBuilderState {
  return {
    ...state,
    pages: state.pages.map((page: BuilderPage) => page.id === pageId ? { ...page, sections: reorderSections(page.sections, preset) } : page),
  };
}
