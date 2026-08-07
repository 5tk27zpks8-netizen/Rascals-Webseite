import { bindings } from "../../../lib/cms";
import { ensureCmsUsersSchema, requireCmsPermission } from "../../../lib/permissions";

export async function GET() {
  const actor = await requireCmsPermission("games");
  if (actor instanceof Response) return actor;
  await ensureCmsUsersSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT email, display_name, role FROM cms_users
    WHERE active=1 AND role IN ('admin','coach','gameday')
    ORDER BY CASE role WHEN 'gameday' THEN 0 WHEN 'coach' THEN 1 ELSE 2 END, display_name, email`).all();
  return Response.json({ items: result.results });
}
