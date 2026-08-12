import { readSiteBuilderState, writeSiteBuilderState, type SiteBuilderState } from "../../lib/site-builder";
import { requireCmsPermission } from "../../lib/permissions";

const reservedSlugs = new Set(["admin", "api", "spielplan"]);

export async function GET() {
  const actor = await requireCmsPermission("hero");
  if (actor instanceof Response) return actor;
  return Response.json({ state: await readSiteBuilderState(), user: actor });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("hero");
  if (actor instanceof Response) return actor;

  let state: SiteBuilderState;
  try { state = await request.json() as SiteBuilderState; }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!state || !Array.isArray(state.pages) || !state.pages.length) {
    return Response.json({ error: "Mindestens eine Seite ist erforderlich." }, { status: 400 });
  }

  const slugs = state.pages.map((page) => page.slug.trim().toLowerCase());
  if (new Set(slugs).size !== slugs.length) {
    return Response.json({ error: "Jede Seite benötigt eine eindeutige URL." }, { status: 400 });
  }

  const reserved = slugs.find((slug) => reservedSlugs.has(slug));
  if (reserved) {
    return Response.json({ error: `Die URL /${reserved} ist für das System reserviert.` }, { status: 400 });
  }

  if (state.pages.some((page) => !page.name.trim())) {
    return Response.json({ error: "Jede Seite benötigt einen Namen." }, { status: 400 });
  }

  await writeSiteBuilderState(state);
  return Response.json({ ok: true, savedAt: new Date().toISOString(), savedBy: actor.email });
}
