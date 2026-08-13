import { publishSiteBuilderState, readSiteBuilderState, type SiteBuilderState } from "../../../../lib/site-builder";
import { appendSiteBuilderRevision } from "../../../../lib/site-builder-history";
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

export async function POST(request: Request) {
  const actor = await requireCmsPermission("website_publish");
  if (actor instanceof Response) return actor;

  let state: SiteBuilderState;
  try {
    const body = await request.json().catch(() => ({})) as { state?: SiteBuilderState };
    state = body.state || await readSiteBuilderState();
  } catch {
    state = await readSiteBuilderState();
  }

  const error = validate(state);
  if (error) return Response.json({ error }, { status: 400 });

  // The public homepage only renders the builder when the homepage is enabled.
  // Older builder drafts were seeded with enabled=false, so clicking Publish could
  // successfully write the published state while the public site kept rendering
  // the legacy homepage. Publishing now explicitly activates the builder homepage.
  const publishable: SiteBuilderState = {
    ...state,
    pages: state.pages.map(page => page.slug === "" ? { ...page, enabled: true } : page),
  };

  const published = await publishSiteBuilderState(publishable);
  await appendSiteBuilderRevision(published, actor, "publish");
  return Response.json({ ok: true, state: published, publishedAt: new Date().toISOString(), publishedBy: actor.email });
}
