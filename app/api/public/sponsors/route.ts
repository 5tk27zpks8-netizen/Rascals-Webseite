import { bindings } from "../../../lib/cms";

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

export async function GET() {
  await ensureSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT id,name,logo,url,tier,sort_order
    FROM sponsors
    WHERE active = 1
    ORDER BY CASE tier
      WHEN 'premium' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'silver' THEN 3
      ELSE 4 END, sort_order ASC, name ASC`).all();
  return Response.json({ items: result.results });
}
