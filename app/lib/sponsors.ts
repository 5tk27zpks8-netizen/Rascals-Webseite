import { bindings } from "./cms";

export type PublicSponsor = {
  id: string;
  name: string;
  logo: string;
  url: string;
  tier: "premium" | "gold" | "silver" | "partner";
  sortOrder: number;
};

async function ensureSponsorsSchema() {
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

function mapRow(row: Record<string, unknown>): PublicSponsor {
  const tierValue = String(row.tier ?? "partner");
  const tier: PublicSponsor["tier"] = ["premium", "gold", "silver"].includes(tierValue)
    ? tierValue as PublicSponsor["tier"]
    : "partner";
  return {
    id: String(row.id),
    name: String(row.name),
    logo: String(row.logo ?? ""),
    url: String(row.url ?? ""),
    tier,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function listActiveSponsors(): Promise<PublicSponsor[]> {
  await ensureSponsorsSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT id, name, logo, url, tier, sort_order
    FROM sponsors
    WHERE active = 1
    ORDER BY CASE tier
      WHEN 'premium' THEN 1
      WHEN 'gold' THEN 2
      WHEN 'silver' THEN 3
      ELSE 4
    END, sort_order ASC, name ASC`).all();
  return result.results.map((row) => mapRow(row as Record<string, unknown>));
}
