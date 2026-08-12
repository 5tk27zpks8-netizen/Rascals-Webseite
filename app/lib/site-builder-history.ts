import { bindings, ensureCmsSchema } from "./cms";
import { normalizeSiteBuilderState, type SiteBuilderState } from "./site-builder";

export type SiteBuilderRevisionAction = "draft" | "publish" | "restore";
export type SiteBuilderRevisionMeta = {
  id: string;
  createdAt: string;
  actorEmail: string;
  actorName: string;
  action: SiteBuilderRevisionAction;
  label: string;
};

type StoredRevision = SiteBuilderRevisionMeta & { state: SiteBuilderState };

const SETTINGS_KEY = "site_builder_history_v1";
const MAX_REVISIONS = 20;

async function readStored(): Promise<StoredRevision[]> {
  await ensureCmsSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT value FROM cms_settings WHERE key = ?").bind(SETTINGS_KEY).first<{ value: string }>();
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value) as StoredRevision[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item => item && typeof item === "object" && item.id && item.state)
      .map(item => ({ ...item, state: normalizeSiteBuilderState(item.state) }))
      .slice(0, MAX_REVISIONS);
  } catch {
    return [];
  }
}

async function writeStored(items: StoredRevision[]) {
  await ensureCmsSchema();
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO cms_settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`)
    .bind(SETTINGS_KEY, JSON.stringify(items.slice(0, MAX_REVISIONS)))
    .run();
}

export async function appendSiteBuilderRevision(
  state: SiteBuilderState,
  actor: { email: string; name: string },
  action: SiteBuilderRevisionAction,
  label?: string,
) {
  const normalized = normalizeSiteBuilderState(state);
  const items = await readStored();
  const serialized = JSON.stringify(normalized);
  if (items[0] && JSON.stringify(items[0].state) === serialized && items[0].action === action) return items[0];
  const revision: StoredRevision = {
    id: `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    actorEmail: actor.email,
    actorName: actor.name || actor.email,
    action,
    label: label || (action === "publish" ? "Website veröffentlicht" : action === "restore" ? "Version wiederhergestellt" : "Entwurf gespeichert"),
    state: normalized,
  };
  await writeStored([revision, ...items]);
  return revision;
}

export async function listSiteBuilderRevisions(): Promise<SiteBuilderRevisionMeta[]> {
  const items = await readStored();
  return items.map(({ state: _state, ...meta }) => meta);
}

export async function getSiteBuilderRevision(id: string): Promise<StoredRevision | null> {
  const items = await readStored();
  return items.find(item => item.id === id) || null;
}
