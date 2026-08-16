import { readPublishedSiteBuilderState, readSiteBuilderState, writeSiteBuilderState, type SiteBuilderState } from "../../lib/site-builder";
import { appendSiteBuilderRevision } from "../../lib/site-builder-history";
import { can, requireCmsPermission } from "../../lib/permissions";

const reservedSlugs = new Set(["admin", "api", "spielplan"]);

function validateState(state: SiteBuilderState) {
  if (!state || !Array.isArray(state.pages) || !state.pages.length) return "Mindestens eine Seite ist erforderlich.";
  const slugs = state.pages.map((page) => page.slug.trim().toLowerCase());
  if (new Set(slugs).size !== slugs.length) return "Jede Seite benötigt eine eindeutige URL.";
  const reserved = slugs.find((slug) => reservedSlugs.has(slug));
  if (reserved) return `Die URL /${reserved} ist für das System reserviert.`;
  if (state.pages.some((page) => !page.name.trim())) return "Jede Seite benötigt einen Namen.";
  return "";
}

function isMainWebsiteEditor(request: Request) {
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    const pathname = new URL(referer).pathname.replace(/\/$/, "");
    return pathname === "/admin/website";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("website_edit");
  if (actor instanceof Response) return actor;

  const [draft, published] = await Promise.all([
    readSiteBuilderState(),
    readPublishedSiteBuilderState(),
  ]);

  // Das Hauptstudio startet immer mit exakt dem aktuell veröffentlichten Stand.
  // Ein älterer gespeicherter Entwurf darf beim Öffnen nicht mehr die Live-Website
  // überlagern. Der bisherige Entwurf bleibt separat erhalten und kann weiterhin
  // über die Entwurf-/Verlaufsfunktionen betrachtet bzw. wiederhergestellt werden.
  const editorStartsFromLive = isMainWebsiteEditor(request);

  return Response.json({
    state: editorStartsFromLive ? published : draft,
    published,
    savedDraft: draft,
    editorStartsFromLive,
    user: actor,
    permissions: { canPublish: can(actor, "website_publish"), canManageDesigns: can(actor, "design_manage") },
  });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("website_edit");
  if (actor instanceof Response) return actor;

  let state: SiteBuilderState;
  try { state = await request.json() as SiteBuilderState; }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const error = validateState(state);
  if (error) return Response.json({ error }, { status: 400 });

  const saved = await writeSiteBuilderState(state);
  await appendSiteBuilderRevision(saved, actor, "draft");
  return Response.json({ ok: true, state: saved, savedAt: new Date().toISOString(), savedBy: actor.email });
}
