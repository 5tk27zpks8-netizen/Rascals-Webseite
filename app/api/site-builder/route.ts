import { defaultSiteBuilderState, readPublishedSiteBuilderState, readSiteBuilderState, writeSiteBuilderState, type BuilderPage, type SiteBuilderState } from "../../lib/site-builder";
import { appendSiteBuilderRevision } from "../../lib/site-builder-history";
import { can, requireCmsPermission } from "../../lib/permissions";

const reservedSlugs = new Set(["admin", "api", "spielplan"]);
const legacySlugs = new Set(["", "ueber-uns", "team", "sponsoring", "shop", "news", "galerie"]);

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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The public site still renders the historic/legacy Rascals page whenever a
 * corresponding builder page is not enabled. In that situation the editor must
 * not pretend that an old builder draft is the live website. Instead we seed the
 * editor with the protected Rascals Standard representation in the same page and
 * section order as the original site. Custom builder-only pages are preserved.
 */
function liveEditorState(published: SiteBuilderState, draft: SiteBuilderState): SiteBuilderState {
  const home = published.pages.find((page) => page.slug === "");
  if (home?.enabled) return clone(published);

  const standard = clone(defaultSiteBuilderState);
  const defaultBySlug = new Map(standard.pages.map((page) => [page.slug, page]));
  const publishedBySlug = new Map(published.pages.map((page) => [page.slug, page]));
  const draftBySlug = new Map(draft.pages.map((page) => [page.slug, page]));

  const legacyPages = standard.pages.map((template) => {
    const liveBuilderPage = publishedBySlug.get(template.slug);
    if (liveBuilderPage?.enabled) return clone(liveBuilderPage);

    // Keep page-level metadata/navigation choices where possible, but use the
    // original Rascals section structure and styling because that is what is
    // actually visible on the public legacy route.
    const source = liveBuilderPage ?? draftBySlug.get(template.slug);
    return {
      ...clone(template),
      id: source?.id || template.id,
      name: source?.name || template.name,
      navLabel: source?.navLabel || template.navLabel,
      showInNav: source?.showInNav ?? template.showInNav,
      title: source?.title || template.title,
      description: source?.description || template.description,
      enabled: false,
    } satisfies BuilderPage;
  });

  const customPages = [...published.pages, ...draft.pages]
    .filter((page, index, all) => !legacySlugs.has(page.slug) && all.findIndex((item) => item.slug === page.slug) === index)
    .map(clone);

  return {
    ...standard,
    pages: [...legacyPages, ...customPages],
  };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("website_edit");
  if (actor instanceof Response) return actor;

  const [draft, published] = await Promise.all([
    readSiteBuilderState(),
    readPublishedSiteBuilderState(),
  ]);

  const editorStartsFromLive = isMainWebsiteEditor(request);
  const liveState = liveEditorState(published, draft);

  return Response.json({
    state: editorStartsFromLive ? liveState : draft,
    published,
    savedDraft: draft,
    editorStartsFromLive,
    legacyLive: !published.pages.find((page) => page.slug === "")?.enabled,
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
