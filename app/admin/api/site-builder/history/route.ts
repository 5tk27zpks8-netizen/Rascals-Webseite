import { writeSiteBuilderState } from "../../../../lib/site-builder";
import { appendSiteBuilderRevision, getSiteBuilderRevision, listSiteBuilderRevisions } from "../../../../lib/site-builder-history";
import { requireCmsPermission } from "../../../../lib/permissions";

export async function GET() {
  const actor = await requireCmsPermission("website_edit");
  if (actor instanceof Response) return actor;
  return Response.json({ items: await listSiteBuilderRevisions() });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("website_edit");
  if (actor instanceof Response) return actor;
  const body = await request.json().catch(() => ({})) as { revisionId?: string };
  if (!body.revisionId) return Response.json({ error: "Revision fehlt." }, { status: 400 });
  const revision = await getSiteBuilderRevision(body.revisionId);
  if (!revision) return Response.json({ error: "Version wurde nicht gefunden." }, { status: 404 });
  const restored = await writeSiteBuilderState(revision.state);
  await appendSiteBuilderRevision(restored, actor, "restore", `Wiederhergestellt: ${revision.label}`);
  return Response.json({ ok: true, state: restored, restoredFrom: revision.id });
}
