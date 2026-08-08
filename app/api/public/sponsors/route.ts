import { bindings } from "../../../lib/cms";

async function ensureColumn(name:string,definition:string){const{DB}=bindings();const info=await DB.prepare("PRAGMA table_info(sponsors)").all<Record<string,unknown>>();if(!info.results.some(r=>String(r.name)===name))await DB.prepare(`ALTER TABLE sponsors ADD COLUMN ${name} ${definition}`).run()}
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
    starts_at TEXT,
    ends_at TEXT,
    deleted_at TEXT,
    deleted_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await ensureColumn("starts_at","TEXT");
  await ensureColumn("ends_at","TEXT");
  await ensureColumn("deleted_at","TEXT");
  await ensureColumn("deleted_by","TEXT");
}

export async function GET() {
  await ensureSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT id,name,logo,url,tier,sort_order
    FROM sponsors
    WHERE active = 1 AND deleted_at IS NULL
      AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
      AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
    ORDER BY CASE tier
      WHEN 'premium' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'silver' THEN 3
      ELSE 4 END, sort_order ASC, name ASC`).all();
  return Response.json({ items: result.results });
}
