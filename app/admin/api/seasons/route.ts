import { bindings } from "../../../lib/cms";
import { requireCmsPermission } from "../../../lib/permissions";
import { ensureRosterFoundation, mapSeason, type SeasonStatus } from "../../../lib/roster";

type SeasonBody = { id?: string; year?: number; name?: string; status?: SeasonStatus; startsAt?: string | null; endsAt?: string | null; isCurrent?: boolean };

export async function GET() {
  const actor = await requireCmsPermission("players");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM seasons ORDER BY year DESC").all<Record<string, unknown>>();
  return Response.json({ items: result.results.map(mapSeason) });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("players");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  const body = await request.json() as SeasonBody;
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return Response.json({ error: "Gültiges Saisonjahr erforderlich." }, { status: 400 });
  const id = body.id?.trim() || `season-${year}`;
  const name = body.name?.trim() || `Saison ${year}`;
  const { DB } = bindings();
  if (body.isCurrent) await DB.prepare("UPDATE seasons SET is_current=0,updated_at=CURRENT_TIMESTAMP").run();
  try {
    await DB.prepare(`INSERT INTO seasons (id,year,name,status,starts_at,ends_at,is_current) VALUES (?,?,?,?,?,?,?)`)
      .bind(id, year, name, body.status ?? "planning", body.startsAt ?? null, body.endsAt ?? null, body.isCurrent ? 1 : 0).run();
  } catch {
    return Response.json({ error: "Für dieses Jahr existiert bereits eine Saison." }, { status: 409 });
  }
  const row = await DB.prepare("SELECT * FROM seasons WHERE id=?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: mapSeason(row!) }, { status: 201 });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("players");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  const body = await request.json() as SeasonBody;
  if (!body.id) return Response.json({ error: "Saison-ID fehlt." }, { status: 400 });
  const { DB } = bindings();
  if (body.isCurrent) await DB.prepare("UPDATE seasons SET is_current=0,updated_at=CURRENT_TIMESTAMP WHERE id<>?").bind(body.id).run();
  await DB.prepare(`UPDATE seasons SET name=COALESCE(?,name),status=COALESCE(?,status),starts_at=?,ends_at=?,is_current=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(body.name?.trim() || null, body.status ?? null, body.startsAt ?? null, body.endsAt ?? null, body.isCurrent ? 1 : 0, body.id).run();
  const row = await DB.prepare("SELECT * FROM seasons WHERE id=?").bind(body.id).first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Saison nicht gefunden." }, { status: 404 });
  return Response.json({ item: mapSeason(row) });
}
