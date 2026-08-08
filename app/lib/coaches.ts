import { bindings } from "./cms";

export type Coach = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  photo: string;
  bio: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

async function ensureColumn(name: string, definition: string) {
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(coaches)").all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === name)) {
    await DB.prepare(`ALTER TABLE coaches ADD COLUMN ${name} ${definition}`).run();
  }
}

export async function ensureCoachesSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS coaches (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    photo TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    deleted_by TEXT
  )`).run();
  await ensureColumn("deleted_at", "TEXT");
  await ensureColumn("deleted_by", "TEXT");
}

export function mapCoach(row: Record<string, unknown>): Coach {
  return {
    id: String(row.id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    role: String(row.role ?? ""),
    photo: String(row.photo ?? ""),
    bio: String(row.bio ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
    active: Number(row.active ?? 1) === 1,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function listActiveCoaches() {
  await ensureCoachesSchema();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM coaches WHERE active=1 AND deleted_at IS NULL ORDER BY sort_order ASC, last_name ASC").all<Record<string, unknown>>();
  return result.results.map(mapCoach);
}
