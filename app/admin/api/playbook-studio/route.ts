import { bindings } from "../../../lib/cms";
import { requireCmsPermission } from "../../../lib/permissions";

type StoreKind = "plays" | "routes" | "scouting";
const allowedKinds = new Set<StoreKind>(["plays", "routes", "scouting"]);

async function ensureSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_studio_store (
    store_key TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL DEFAULT 'null',
    updated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function kindFrom(value: unknown): StoreKind | null {
  const kind = String(value ?? "") as StoreKind;
  return allowedKinds.has(kind) ? kind : null;
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureSchema();
  const kind = kindFrom(new URL(request.url).searchParams.get("kind"));
  if (!kind) return Response.json({ error: "Ungültiger Playbook-Store." }, { status: 400 });
  const { DB } = bindings();
  const row = await DB.prepare("SELECT payload_json,updated_by,updated_at FROM playbook_studio_store WHERE store_key=? LIMIT 1").bind(kind).first<Record<string, unknown>>();
  if (!row) return Response.json({ kind, data: null, updatedAt: null, updatedBy: "" });
  try {
    return Response.json({ kind, data: JSON.parse(String(row.payload_json ?? "null")), updatedAt: String(row.updated_at ?? ""), updatedBy: String(row.updated_by ?? "") });
  } catch {
    return Response.json({ kind, data: null, updatedAt: String(row.updated_at ?? ""), updatedBy: String(row.updated_by ?? "") });
  }
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureSchema();
  const body = await request.json() as { kind?: StoreKind; data?: unknown };
  const kind = kindFrom(body.kind);
  if (!kind) return Response.json({ error: "Ungültiger Playbook-Store." }, { status: 400 });
  const payload = JSON.stringify(body.data ?? null);
  if (payload.length > 2_000_000) return Response.json({ error: "Playbook-Daten sind zu groß." }, { status: 413 });
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO playbook_studio_store (store_key,payload_json,updated_by,updated_at)
    VALUES (?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(store_key) DO UPDATE SET payload_json=excluded.payload_json,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
    .bind(kind, payload, actor.email)
    .run();
  return Response.json({ ok: true, kind });
}
