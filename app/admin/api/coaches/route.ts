import { bindings } from "../../../lib/cms";
import { ensureCoachesSchema, mapCoach } from "../../../lib/coaches";
import { requireCmsPermission } from "../../../lib/permissions";

type CoachBody = {
  id?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  photo?: string;
  bio?: string;
  sortOrder?: number;
  active?: boolean;
};

async function authorize() { return requireCmsPermission("coaches"); }

export async function GET() {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureCoachesSchema();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM coaches ORDER BY sort_order ASC, last_name ASC").all<Record<string, unknown>>();
  return Response.json({ items: result.results.map(mapCoach) });
}

export async function POST(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureCoachesSchema();
  const body = await request.json() as CoachBody;
  if (!body.firstName?.trim() || !body.lastName?.trim()) return Response.json({ error: "Vor- und Nachname sind erforderlich." }, { status: 400 });
  const id = crypto.randomUUID();
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO coaches (id,first_name,last_name,role,photo,bio,sort_order,active) VALUES (?,?,?,?,?,?,?,?)`).bind(
    id, body.firstName.trim(), body.lastName.trim(), body.role?.trim() ?? "", body.photo ?? "", body.bio ?? "", Number(body.sortOrder ?? 0), body.active === false ? 0 : 1
  ).run();
  const row = await DB.prepare("SELECT * FROM coaches WHERE id=?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: mapCoach(row!) }, { status: 201 });
}

export async function PUT(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureCoachesSchema();
  const body = await request.json() as CoachBody;
  if (!body.id || !body.firstName?.trim() || !body.lastName?.trim()) return Response.json({ error: "ID, Vor- und Nachname sind erforderlich." }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare(`UPDATE coaches SET first_name=?,last_name=?,role=?,photo=?,bio=?,sort_order=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(
    body.firstName.trim(), body.lastName.trim(), body.role?.trim() ?? "", body.photo ?? "", body.bio ?? "", Number(body.sortOrder ?? 0), body.active === false ? 0 : 1, body.id
  ).run();
  const row = await DB.prepare("SELECT * FROM coaches WHERE id=?").bind(body.id).first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Coach nicht gefunden." }, { status: 404 });
  return Response.json({ item: mapCoach(row) });
}

export async function DELETE(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  await ensureCoachesSchema();
  const { DB } = bindings();
  await DB.prepare("DELETE FROM coaches WHERE id=?").bind(id).run();
  return Response.json({ ok: true });
}
