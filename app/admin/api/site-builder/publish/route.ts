import { publishSiteBuilderState, readPublishedSiteBuilderState, readSiteBuilderState, type SiteBuilderState } from "../../../../lib/site-builder";
import { appendSiteBuilderRevision } from "../../../../lib/site-builder-history";
import { reconcileSiteBuilderMedia } from "../../../../lib/site-builder-media";
import { requireCmsPermission } from "../../../../lib/permissions";

const reservedSlugs = new Set(["admin", "api", "spielplan"]);

function validate(state: SiteBuilderState) {
  if (!state?.pages?.length) return "Mindestens eine Seite ist erforderlich.";
  const slugs = state.pages.map(page => page.slug.trim().toLowerCase());
  if (new Set(slugs).size !== slugs.length) return "Jede Seite benötigt eine eindeutige URL.";
  const reserved = slugs.find(slug => reservedSlugs.has(slug));
  if (reserved) return `Die URL /${reserved} ist für das System reserviert.`;
  if (state.pages.some(page => !page.name.trim())) return "Jede Seite benötigt einen Namen.";
  return "";
}

function sameState(a: SiteBuilderState, b: SiteBuilderState) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("website_publish");
  if (actor instanceof Response) return actor;

  const previous = await readSiteBuilderState();
  let state: SiteBuilderState;
  try {
    const body = await request.json().catch(() => ({})) as { state?: SiteBuilderState };
    state = body.state || previous;
  } catch {
    state = previous;
  }

  const error = validate(state);
  if (error) return Response.json({ error }, { status: 400, headers: { "cache-control": "no-store" } });

  const reconciled = reconcileSiteBuilderMedia(previous, state);
  const publishable: SiteBuilderState = {
    ...reconciled,
    pages: reconciled.pages.map(page => page.slug === "" ? { ...page, enabled: true } : page),
  };

  const published = await publishSiteBuilderState(publishable);
  const verified = await readPublishedSiteBuilderState();

  if (!sameState(published, verified)) {
    return Response.json({
      error: "Veröffentlichung konnte nicht verifiziert werden. Der gespeicherte Live-Stand weicht vom veröffentlichten Stand ab.",
    }, { status: 500, headers: { "cache-control": "no-store" } });
  }

  await appendSiteBuilderRevision(verified, actor, "publish");
  return Response.json({
    ok: true,
    verified: true,
    state: verified,
    publishedAt: new Date().toISOString(),
    publishedBy: actor.email,
  }, { headers: { "cache-control": "no-store" } });
}
