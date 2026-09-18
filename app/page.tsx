import { CmsHero } from "./CmsHero";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { HomeSectionMedia } from "./HomeSectionMedia";
import { SiteBuilderPage } from "./SiteBuilderPage";
import { SiteShell } from "./SiteShell";
import { findBuilderPage, readPublishedSiteBuilderState, readSiteBuilderState } from "./lib/site-builder";
import { readSiteDesign } from "./lib/site-design";
import { HomeMatchday } from "./HomeMatchday";
import { HomeArena } from "./HomeArena";
import { HomeHybrid } from "./HomeHybrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  const state = await readPublishedSiteBuilderState();
  const page = findBuilderPage(state, "");
  if (!page?.enabled) return {};
  const heroImage = page.sections.find(section => section.visible && section.type === "hero")?.image;
  return {
    title: page.title || page.name,
    description: page.description || undefined,
    alternates: { canonical: "/" },
    openGraph: {
      title: page.title || page.name,
      description: page.description || undefined,
      url: "/",
      images: heroImage ? [{ url: heroImage }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title || page.name,
      description: page.description || undefined,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export default async function Home({ searchParams }: { searchParams?: Promise<{ studio_mirror?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const isStudioMirror = params?.studio_mirror === "1";
  const state = isStudioMirror ? await readSiteBuilderState() : await readPublishedSiteBuilderState();
  const builderPage = findBuilderPage(state, "");

  if (builderPage && (builderPage.enabled || isStudioMirror)) {
    return <SiteBuilderPage state={state} page={builderPage} />;
  }

  // Which complete design is live is a CMS setting, chosen under /admin/designs.
  // Each one is its own page, not a repaint of the same one.
  const design = await readSiteDesign();
  if (design === "matchday") return <HomeMatchday />;
  if (design === "arena") return <HomeArena />;
  if (design === "hybrid") return <HomeHybrid />;

  return <><SiteShell page="home" heroOverride={<CmsHero/>}/><DynamicHomeFeeds/><DynamicHomeGames/><HomeSectionMedia/></>;
}
