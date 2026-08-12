import { bindings, ensureCmsSchema } from "./cms";
import type { DesignPreset } from "./design-presets";

const SETTINGS_KEY = "site_design_presets_v1";

function sanitizePreset(input: DesignPreset): DesignPreset | null {
  if (!input || typeof input !== "object") return null;
  const name = String(input.name || "").trim().slice(0, 80);
  if (!name) return null;
  return {
    ...input,
    id: String(input.id || crypto.randomUUID()).slice(0, 120),
    name,
    description: String(input.description || "Eigenes gespeichertes Design").slice(0, 240),
    category: "custom",
    builtin: false,
    palette: Array.isArray(input.palette) ? input.palette.map(String).slice(0, 6) : [],
    theme: input.theme || {},
    defaults: input.defaults || {},
    byType: input.byType || {},
    sectionStyles: Array.isArray(input.sectionStyles) ? input.sectionStyles.slice(0, 80) : [],
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

export async function readCustomDesignPresets(): Promise<DesignPreset[]> {
  await ensureCmsSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT value FROM cms_settings WHERE key = ?").bind(SETTINGS_KEY).first<{ value: string }>();
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value) as DesignPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizePreset).filter((item): item is DesignPreset => Boolean(item));
  } catch {
    return [];
  }
}

export async function writeCustomDesignPresets(items: DesignPreset[]) {
  await ensureCmsSchema();
  const clean = items.map(sanitizePreset).filter((item): item is DesignPreset => Boolean(item)).slice(0, 50);
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO cms_settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`)
    .bind(SETTINGS_KEY, JSON.stringify(clean))
    .run();
  return clean;
}
