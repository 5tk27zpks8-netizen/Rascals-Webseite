import { requireCmsPermission } from "../../../lib/permissions";
import { readSiteDesign, writeSiteDesign, SITE_DESIGNS } from "../../../lib/site-design";

export async function GET() {
  const actor = await requireCmsPermission("design_manage");
  if (actor instanceof Response) return actor;
  return Response.json({ active: await readSiteDesign(), designs: SITE_DESIGNS });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("design_manage");
  if (actor instanceof Response) return actor;
  let body: { design?: unknown };
  try {
    body = await request.json() as { design?: unknown };
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  try {
    const active = await writeSiteDesign(body.design);
    return Response.json({ ok: true, active, savedBy: actor.email });
  } catch {
    return Response.json({ error: "Unbekanntes Design." }, { status: 400 });
  }
}
