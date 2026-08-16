import { defaultSiteBuilderState, readPublishedSiteBuilderState, readSiteBuilderState, writeSiteBuilderState, type BuilderPage, type BuilderSection, type SiteBuilderState } from "../../lib/site-builder";
import { appendSiteBuilderRevision } from "../../lib/site-builder-history";
import { reconcileSiteBuilderMedia } from "../../lib/site-builder-media";
import { can, requireCmsPermission } from "../../lib/permissions";

const reservedSlugs = new Set(["admin", "api", "spielplan"]);
const legacySlugs = new Set(["", "ueber-uns", "team", "sponsoring", "shop", "news", "galerie"]);
const shopUrl = "https://hellenstein-rascals.myshopify.com";
const productUrl = `${shopUrl}/products/puli`;

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

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

function normalizeEditableBackgroundMedia(input: SiteBuilderState): SiteBuilderState {
  const state = clone(input);
  for (const page of state.pages) {
    for (const section of page.sections) {
      const legacyHero = section.type === "hero" && section.variant === "legacy-home";
      const legacyJoin = section.type === "cta" && section.variant === "legacy-join";
      if ((!legacyHero && !legacyJoin) || !section.image) continue;

      const mode = section.style.backgroundMode || "color";
      const background = (section.style.background || "").toLowerCase();
      const stillLegacyDefault = legacyHero ? background === "#050d18" : background === "#020810";

      if (!section.style.backgroundImage && (mode === "image" || (mode === "color" && stillLegacyDefault))) {
        section.style.backgroundImage = section.image;
        section.style.backgroundMode = "image";
      }
    }
  }
  return state;
}

function legacyHomeSections(template: BuilderPage): BuilderSection[] {
  const byId = new Map(template.sections.map((section) => [section.id, clone(section)]));
  const hero = byId.get("seed-home-hero")!;
  hero.variant = "legacy-home";
  hero.items = [{ id: "legacy-hero-secondary", title: "Spielplan 2026", linkLabel: "Spielplan 2026", linkUrl: "/spielplan" }];
  hero.style.minHeight = 660;
  hero.style.paddingTop = 0;
  hero.style.paddingBottom = 0;
  hero.style.backgroundMode = "image";
  hero.style.backgroundImage = hero.image || "";

  const stats = byId.get("seed-home-stats")!;
  stats.variant = "legacy-strip";
  stats.eyebrow = "";
  stats.title = "";
  stats.style.background = "#dc1726";
  stats.style.textColor = "#ffffff";
  stats.style.accentColor = "#ffffff";
  stats.style.paddingTop = 0;
  stats.style.paddingBottom = 0;

  const games = byId.get("seed-home-games")!;
  games.variant = "legacy-games";
  games.eyebrow = "SAISON 2026";
  games.title = "NÄCHSTE GAMES.";
  games.text = "Bestätigte Begegnungen der Rascals in der Kreisoberliga.";
  games.style.background = "#f2f3ef";
  games.style.textColor = "#07172b";
  games.style.paddingTop = 128;
  games.style.paddingBottom = 128;

  const story = byId.get("seed-home-story")!;
  story.variant = "legacy-story";
  story.text = "Seit 2023 bringen wir American Football zurück unter den Hellenstein. Bei uns zählen Einsatz, Fairness und der Mensch unter dem Helm.";
  story.items = [{ id: "legacy-story-p2", text: "Ob Rookie oder Veteran: Wer für das Team alles gibt, gehört dazu." }];
  story.style.paddingTop = 0;
  story.style.paddingBottom = 0;

  const shop: BuilderSection = {
    id: "seed-home-teamwear",
    type: "cards",
    variant: "legacy-shop",
    visible: true,
    eyebrow: "OFFICIAL TEAMWEAR",
    title: "WEAR THE",
    accent: "RASCALS.",
    text: "Zeig deine Farben – auf der Tribüne, im Training und überall dazwischen. Direkt im offiziellen RASCALS-SHOP bestellen.",
    buttonLabel: "Zum Rascals Shop",
    buttonUrl: shopUrl,
    image: "/shop-product-4k.webp",
    elementStyles: {},
    style: {
      ...clone(story.style),
      background: "#07172b",
      textColor: "#ffffff",
      accentColor: "#dc1726",
      paddingTop: 128,
      paddingBottom: 128,
    },
    items: [
      { id: "shop-main", eyebrow: "SHOP DROP · 01", title: "Puli", subtitle: "25,00 €", image: "/shop-product-4k.webp", linkLabel: "Puli", linkUrl: productUrl },
      { id: "shop-detail", eyebrow: "DETAIL", title: "Teamwear", subtitle: "Shop ansehen", image: "/shop-product-4k.webp", linkLabel: "Shop ansehen", linkUrl: productUrl },
      { id: "shop-online", eyebrow: "ONLINE", title: "Rascals Gear", subtitle: "Alle Artikel", image: "/shop-product-4k.webp", linkLabel: "Alle Artikel", linkUrl: shopUrl },
    ],
  };

  const news = byId.get("seed-home-news")!;
  news.variant = "legacy-news";
  news.style.background = "#f2f3ef";
  news.style.textColor = "#07172b";

  const sponsors = byId.get("seed-home-sponsors")!;
  sponsors.variant = "legacy-ticker";

  const cta = byId.get("seed-home-cta")!;
  cta.variant = "legacy-join";
  cta.image = "/team-entry-4k.webp";
  cta.style.background = "#020810";
  cta.style.textColor = "#ffffff";
  cta.style.minHeight = 620;
  cta.style.paddingTop = 0;
  cta.style.paddingBottom = 0;
  cta.style.backgroundMode = "image";
  cta.style.backgroundImage = cta.image;

  return [hero, stats, games, story, shop, news, sponsors, cta];
}

function mirrorLegacyPage(template: BuilderPage): BuilderPage {
  const next = clone(template);
  if (next.slug === "") next.sections = legacyHomeSections(next);
  return next;
}

function liveEditorState(published: SiteBuilderState, draft: SiteBuilderState): SiteBuilderState {
  const home = published.pages.find((page) => page.slug === "");
  if (home?.enabled) return { ...clone(published), editorInitialized: true };

  const standard = clone(defaultSiteBuilderState);
  const publishedBySlug = new Map(published.pages.map((page) => [page.slug, page]));
  const draftBySlug = new Map(draft.pages.map((page) => [page.slug, page]));

  const legacyPages = standard.pages.map((rawTemplate) => {
    const template = mirrorLegacyPage(rawTemplate);
    const liveBuilderPage = publishedBySlug.get(template.slug);
    if (liveBuilderPage?.enabled) return clone(liveBuilderPage);

    const source = liveBuilderPage ?? draftBySlug.get(template.slug);
    return {
      ...template,
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

  return { ...standard, editorInitialized: true, pages: [...legacyPages, ...customPages] };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("website_edit");
  if (actor instanceof Response) return actor;

  const [draft, published] = await Promise.all([readSiteBuilderState(), readPublishedSiteBuilderState()]);
  const editorStartsFromLive = isMainWebsiteEditor(request);
  const firstStudioOpen = editorStartsFromLive && draft.editorInitialized !== true;
  const rawState = firstStudioOpen ? liveEditorState(published, draft) : draft;
  const state = normalizeEditableBackgroundMedia(rawState);

  return Response.json({
    state,
    published,
    savedDraft: draft,
    editorStartsFromLive: firstStudioOpen,
    legacyLive: !published.pages.find((page) => page.slug === "")?.enabled,
    user: actor,
    permissions: { canPublish: can(actor, "website_publish"), canManageDesigns: can(actor, "design_manage") },
  }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("website_edit");
  if (actor instanceof Response) return actor;

  let state: SiteBuilderState;
  try { state = await request.json() as SiteBuilderState; }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const error = validateState(state);
  if (error) return Response.json({ error }, { status: 400 });

  const previous = await readSiteBuilderState();
  const reconciled = reconcileSiteBuilderMedia(previous, state);
  const saved = await writeSiteBuilderState(reconciled);
  await appendSiteBuilderRevision(saved, actor, "draft");
  return Response.json({ ok: true, state: saved, savedAt: new Date().toISOString(), savedBy: actor.email }, { headers: { "cache-control": "no-store" } });
}
