import { bindings } from "../../../lib/cms";
import { ensureFootballSchema, mapPlayer, slugify, type Player } from "../../../lib/football";
import { requireCmsPermission } from "../../../lib/permissions";

async function allowed() {
  const actor = await requireCmsPermission("players" as never);
  return actor instanceof Response ? actor : actor;
}

async function ensureTrashColumns() {
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(players)").all<Record<string, unknown>>();
  const columns = new Set(info.results.map((row) => String(row.name)));
  if (!columns.has("deleted_at")) await DB.prepare("ALTER TABLE players ADD COLUMN deleted_at TEXT").run();
  if (!columns.has("deleted_by")) await DB.prepare("ALTER TABLE players ADD COLUMN deleted_by TEXT").run();
}

export async function GET(request: Request) {
  const actor = await allowed();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureTrashColumns();
  const { DB } = bindings();
  const includeDeleted = new URL(request.url).searchParams.get("deleted") === "1";
  const where = includeDeleted ? "deleted_at IS NOT NULL" : "deleted_at IS NULL";
  const result = await DB.prepare(`SELECT * FROM players WHERE ${where} ORDER BY active DESC, unit, position, jersey_number, last_name`).all();
  return Response.json({ items: result.results.map((row) => mapPlayer(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const actor = await allowed();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureTrashColumns();
  const body = await request.json() as Partial<Player>;
  if (!body.firstName?.trim() || !body.lastName?.trim()) return Response.json({ error: "Vor- und Nachname sind erforderlich." }, { status: 400 });
  const id = crypto.randomUUID();
  const slug = slugify(body.slug || `${body.firstName}-${body.lastName}`) || id;
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO players (id,slug,first_name,last_name,nickname,jersey_number,position,secondary_position,unit,team_id,height_cm,weight_kg,birth_date,joined_year,portrait,bio,instagram,captain,starter,rookie,status,return_date,active)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, slug, body.firstName.trim(), body.lastName.trim(), body.nickname ?? "", body.jerseyNumber ?? null, body.position ?? "", body.secondaryPosition ?? "", body.unit ?? "defense", body.teamId ?? "mens",
      body.heightCm ?? null, body.weightKg ?? null, body.birthDate ?? null, body.joinedYear ?? null, body.portrait ?? "", body.bio ?? "", body.instagram ?? "", body.captain ? 1 : 0, body.starter ? 1 : 0, body.rookie ? 1 : 0,
      body.status ?? "active", body.returnDate ?? null, body.active === false ? 0 : 1,
    ).run();
  const row = await DB.prepare("SELECT * FROM players WHERE id=?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: mapPlayer(row!) }, { status: 201 });
}

export async function PUT(request: Request) {
  const actor = await allowed();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureTrashColumns();
  const body = await request.json() as Partial<Player> & { restore?: boolean };
  if (!body.id) return Response.json({ error: "ID ist erforderlich." }, { status: 400 });
  const { DB } = bindings();

  if (body.restore) {
    await DB.prepare("UPDATE players SET deleted_at=NULL, deleted_by=NULL, active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.id).run();
    const restored = await DB.prepare("SELECT * FROM players WHERE id=?").bind(body.id).first<Record<string, unknown>>();
    if (!restored) return Response.json({ error: "Spieler nicht gefunden." }, { status: 404 });
    return Response.json({ item: mapPlayer(restored) });
  }

  if (!body.firstName?.trim() || !body.lastName?.trim()) return Response.json({ error: "Vor- und Nachname sind erforderlich." }, { status: 400 });
  const slug = slugify(body.slug || `${body.firstName}-${body.lastName}`) || body.id;
  await DB.prepare(`UPDATE players SET slug=?,first_name=?,last_name=?,nickname=?,jersey_number=?,position=?,secondary_position=?,unit=?,team_id=?,height_cm=?,weight_kg=?,birth_date=?,joined_year=?,portrait=?,bio=?,instagram=?,captain=?,starter=?,rookie=?,status=?,return_date=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL`).bind(
    slug, body.firstName.trim(), body.lastName.trim(), body.nickname ?? "", body.jerseyNumber ?? null, body.position ?? "", body.secondaryPosition ?? "", body.unit ?? "defense", body.teamId ?? "mens",
    body.heightCm ?? null, body.weightKg ?? null, body.birthDate ?? null, body.joinedYear ?? null, body.portrait ?? "", body.bio ?? "", body.instagram ?? "", body.captain ? 1 : 0, body.starter ? 1 : 0, body.rookie ? 1 : 0,
    body.status ?? "active", body.returnDate ?? null, body.active === false ? 0 : 1, body.id,
  ).run();
  const row = await DB.prepare("SELECT * FROM players WHERE id=?").bind(body.id).first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Spieler nicht gefunden." }, { status: 404 });
  return Response.json({ item: mapPlayer(row) });
}

export async function DELETE(request: Request) {
  const actor = await allowed();
  if (actor instanceof Response) return actor;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  await ensureFootballSchema();
  await ensureTrashColumns();
  const { DB } = bindings();
  await DB.prepare("UPDATE players SET deleted_at=CURRENT_TIMESTAMP, deleted_by=?, active=0, updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL").bind(actor.email, id).run();
  return Response.json({ ok: true });
}
