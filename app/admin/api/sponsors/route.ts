import { getChatGPTUser } from "../../../chatgpt-auth";
import { bindings } from "../../../lib/cms";

export type Sponsor = {
  id: string;
  name: string;
  logo: string;
  url: string;
  tier: "premium" | "gold" | "silver" | "partner";
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

async function ensureSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS sponsors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    tier TEXT NOT NULL DEFAULT 'partner',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function mapRow(row: Record<string, unknown>): Sponsor {
  return {
    id: String(row.id),
    name: String(row.name),
    logo: String(row.logo ?? ""),
    url: String(row.url ?? ""),
    tier: ["premium", "gold", "silver"].includes(String(row.tier)) ? String(row.tier) as Sponsor["tier"] : "partner",
    sortOrder: Number(row.sort_order ?? 0),
    active: Number(row.active ?? 1) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function requireUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  return user;
}

export async function GET() {
  if (!await requireUser()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM sponsors ORDER BY sort_order ASC, name ASC").all();
  return Response.json({ items: result.results.map((row) => mapRow(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  if (!await requireUser()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const body = await request.json() as Partial<Sponsor>;
  if (!body.name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });
  const id = crypto.randomUUID();
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO sponsors (id,name,logo,url,tier,sort_order,active) VALUES (?,?,?,?,?,?,?)`)
    .bind(id, body.name.trim(), body.logo ?? "", body.url ?? "", body.tier ?? "partner", Number(body.sortOrder ?? 0), body.active === false ? 0 : 1)
    .run();
  const row = await DB.prepare("SELECT * FROM sponsors WHERE id = ?").bind(id).first();
  return Response.json({ item: mapRow(row as Record<string, unknown>) }, { status: 201 });
}

export async function PUT(request: Request) {
  if (!await requireUser()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const body = await request.json() as Partial<Sponsor>;
  if (!body.id || !body.name?.trim()) return Response.json({ error: "ID and name are required" }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare(`UPDATE sponsors SET name=?,logo=?,url=?,tier=?,sort_order=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(body.name.trim(), body.logo ?? "", body.url ?? "", body.tier ?? "partner", Number(body.sortOrder ?? 0), body.active === false ? 0 : 1, body.id)
    .run();
  const row = await DB.prepare("SELECT * FROM sponsors WHERE id = ?").bind(body.id).first();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ item: mapRow(row as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  if (!await requireUser()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID is required" }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare("DELETE FROM sponsors WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
