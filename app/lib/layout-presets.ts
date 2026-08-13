import type { BuilderPage, BuilderSection, BuilderSectionType, SiteBuilderState } from "./site-builder";

export type LayoutPresetId = "original" | "stadium" | "editorial" | "performance";
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
    name: "Original",
    eyebrow: "RASCALS CLASSIC",
    description: "Der aktuelle Seitenaufbau bleibt erhalten. Nur der gewählte Design-Look wird verändert.",
    order: [],
    variants: {},
  },
  {
    id: "stadium",
    name: "Stadium",
    eyebrow: "BIG GAME EXPERIENCE",
    description: "Bildstarker Sportaufbau: Hero, nächstes Spiel und Saison-KPIs stehen sofort im Mittelpunkt.",
    order: ["hero", "games", "stats", "split", "news", "gallery", "timeline", "cta", "sponsors"],
    variants: { hero: "cinematic", games: "scoreboard", stats: "bold", split: "image-left", news: "editorial", gallery: "cinematic", timeline: "drive", cta: "banner", sponsors: "ticker" },
  },
  {
    id: "editorial",
    name: "Editorial",
    eyebrow: "NFL MAGAZINE",
    description: "Medienorientierter Aufbau: Stories und News führen die Seite, Spiele und Team-Features folgen wie in einem Sportmagazin.",
    order: ["news", "hero", "games", "split", "stats", "gallery", "timeline", "sponsors", "cta"],
    variants: { news: "editorial", hero: "split", games: "clean", split: "editorial", stats: "strip", gallery: "masonry", timeline: "compact", sponsors: "clean", cta: "panel" },
  },
  {
    id: "performance",
    name: "Performance",
    eyebrow: "PRO TEAM SYSTEM",
    description: "Moderner Performance-Aufbau: Hero, KPIs, Game Center und Team-Inhalte wirken wie bei einem professionellen Sportprogramm.",
    order: ["hero", "stats", "games", "cards", "split", "timeline", "gallery", "news", "sponsors", "cta"],
    variants: { hero: "centered", stats: "cards", games: "scoreboard", cards: "bold", split: "image-right", timeline: "vertical", gallery: "grid", news: "clean", sponsors: "ticker", cta: "panel" },
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
