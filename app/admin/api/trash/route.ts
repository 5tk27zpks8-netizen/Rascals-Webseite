import { bindings } from "../../../lib/cms";
import { requireCmsPermission } from "../../../lib/permissions";

type TrashType = "news" | "sponsor" | "player" | "game" | "coach";
type TrashItem = { type: TrashType; id: string; title: string; subtitle: string; deletedAt: string; deletedBy: string };

async function tableExists(name: string) {
  const { DB } = bindings();
  const row = await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(name).first<{ name: string }>();
  return Boolean(row);
}

async function ensureColumn(table: string, name: string, definition: string) {
  if (!(await tableExists(table))) return;
  const { DB } = bindings();
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === name)) {
    await DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
  }
}

async function ensureTrashColumns() {
  for (const table of ["news_posts", "sponsors", "players", "games", "coaches"]) {
    await ensureColumn(table, "deleted_at", "TEXT");
    await ensureColumn(table, "deleted_by", "TEXT");
  }
}

export async function GET() {
  const actor = await requireCmsPermission("trash");
  if (actor instanceof Response) return actor;
  await ensureTrashColumns();
  const { DB } = bindings();
  const items: TrashItem[] = [];

  if (await tableExists("news_posts")) {
    const rows = await DB.prepare("SELECT id,title,category,deleted_at,deleted_by FROM news_posts WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all<Record<string, unknown>>();
    items.push(...rows.results.map((row) => ({ type: "news" as const, id: String(row.id), title: String(row.title ?? "News"), subtitle: String(row.category ?? "News"), deletedAt: String(row.deleted_at ?? ""), deletedBy: String(row.deleted_by ?? "") })));
  }
  if (await tableExists("sponsors")) {
    const rows = await DB.prepare("SELECT id,name,tier,deleted_at,deleted_by FROM sponsors WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all<Record<string, unknown>>();
    items.push(...rows.results.map((row) => ({ type: "sponsor" as const, id: String(row.id), title: String(row.name ?? "Sponsor"), subtitle: String(row.tier ?? "Partner"), deletedAt: String(row.deleted_at ?? ""), deletedBy: String(row.deleted_by ?? "") })));
  }
  if (await tableExists("players")) {
    const rows = await DB.prepare("SELECT id,first_name,last_name,jersey_number,position,deleted_at,deleted_by FROM players WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all<Record<string, unknown>>();
    items.push(...rows.results.map((row) => ({ type: "player" as const, id: String(row.id), title: `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim() || "Spieler", subtitle: `#${row.jersey_number ?? "–"} · ${String(row.position ?? "")}`, deletedAt: String(row.deleted_at ?? ""), deletedBy: String(row.deleted_by ?? "") })));
  }
  if (await tableExists("games")) {
    const rows = await DB.prepare("SELECT id,opponent,kickoff,deleted_at,deleted_by FROM games WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all<Record<string, unknown>>();
    items.push(...rows.results.map((row) => ({ type: "game" as const, id: String(row.id), title: `Rascals vs. ${String(row.opponent ?? "Gegner")}`, subtitle: row.kickoff ? String(row.kickoff) : "Kein Termin", deletedAt: String(row.deleted_at ?? ""), deletedBy: String(row.deleted_by ?? "") })));
  }
  if (await tableExists("coaches")) {
    const rows = await DB.prepare("SELECT id,first_name,last_name,role,deleted_at,deleted_by FROM coaches WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC").all<Record<string, unknown>>();
    items.push(...rows.results.map((row) => ({ type: "coach" as const, id: String(row.id), title: `${String(row.first_name ?? "")} ${String(row.last_name ?? "")}`.trim() || "Coach", subtitle: String(row.role ?? "Coach"), deletedAt: String(row.deleted_at ?? ""), deletedBy: String(row.deleted_by ?? "") })));
  }

  items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  return Response.json({ items });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("trash");
  if (actor instanceof Response) return actor;
  await ensureTrashColumns();
  const body = await request.json() as { type?: TrashType; id?: string };
  if (!body.type || !body.id) return Response.json({ error: "Typ und ID sind erforderlich." }, { status: 400 });
  const { DB } = bindings();

  const actions: Record<TrashType, () => Promise<unknown>> = {
    news: () => DB.prepare("UPDATE news_posts SET deleted_at=NULL,deleted_by=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.id).run(),
    sponsor: () => DB.prepare("UPDATE sponsors SET deleted_at=NULL,deleted_by=NULL,active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.id).run(),
    player: () => DB.prepare("UPDATE players SET deleted_at=NULL,deleted_by=NULL,active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.id).run(),
    game: () => DB.prepare("UPDATE games SET deleted_at=NULL,deleted_by=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.id).run(),
    coach: () => DB.prepare("UPDATE coaches SET deleted_at=NULL,deleted_by=NULL,active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.id).run(),
  };

  if (!(await tableExists({ news:"news_posts", sponsor:"sponsors", player:"players", game:"games", coach:"coaches" }[body.type]))) {
    return Response.json({ error: "Bereich nicht gefunden." }, { status: 404 });
  }
  await actions[body.type]();
  return Response.json({ ok: true });
}
