import { bindings } from "../../../lib/cms";
import { ensureCmsUsersSchema, requireCmsPermission, type CmsRole } from "../../../lib/permissions";

const roles = new Set<CmsRole>(["admin", "editor", "photographer", "coach", "gameday", "viewer"]);

export async function GET() {
  const actor = await requireCmsPermission("users");
  if (actor instanceof Response) return actor;
  await ensureCmsUsersSchema();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT email, display_name, role, active, created_at, updated_at FROM cms_users ORDER BY role, email").all();
  return Response.json({ items: result.results, current: actor });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("users");
  if (actor instanceof Response) return actor;
  await ensureCmsUsersSchema();
  const body = await request.json() as { email?: string; displayName?: string; role?: CmsRole; active?: boolean };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return Response.json({ error: "Valid email is required" }, { status: 400 });
  const role: CmsRole = roles.has(body.role as CmsRole) ? body.role as CmsRole : "viewer";
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO cms_users (email, display_name, role, active)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name, role=excluded.role, active=excluded.active, updated_at=CURRENT_TIMESTAMP`)
    .bind(email, body.displayName?.trim() ?? "", role, body.active === false ? 0 : 1)
    .run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const actor = await requireCmsPermission("users");
  if (actor instanceof Response) return actor;
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
  if (email === actor.email.toLowerCase()) return Response.json({ error: "You cannot delete your own account" }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare("DELETE FROM cms_users WHERE lower(email)=lower(?)").bind(email).run();
  return Response.json({ ok: true });
}
