import { publishSiteBuilderState, readSiteBuilderState, type SiteBuilderState } from "../../../../lib/site-builder";
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
  if (error) return Response.json({ error }, { status: 400 });

  const reconciled = reconcileSiteBuilderMedia(previous, state);

  // The public homepage only renders the builder when the homepage is enabled.
  // Publishing explicitly activates the builder homepage while preserving the
  // reconciled image state used by the studio preview.
  const publishable: SiteBuilderState = {
    ...reconciled,
    pages: reconciled.pages.map(page => page.slug === "" ? { ...page, enabled: true } : page),
  };

  const published = await publishSiteBuilderState(publishable);
  await appendSiteBuilderRevision(published, actor, "publish");
  return Response.json({ ok: true, state: published, publishedAt: new Date().toISOString(), publishedBy: actor.email });
}
