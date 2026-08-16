import { CmsHero } from "./CmsHero";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { HomeSectionMedia } from "./HomeSectionMedia";
import { SiteBuilderPage } from "./SiteBuilderPage";
import { SiteShell } from "./SiteShell";
import { findBuilderPage, readPublishedSiteBuilderState, readSiteBuilderState } from "./lib/site-builder";

export const dynamic = "force-dynamic";

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

  // Studio mirror: same public renderer, but always with the latest saved draft.
  // Public visitors continue to receive only the published state.
  if (builderPage && (builderPage.enabled || isStudioMirror)) {
    return <SiteBuilderPage state={state} page={builderPage} />;
  }

  return <><CmsHero/><SiteShell page="home"/><DynamicHomeFeeds/><DynamicHomeGames/><HomeSectionMedia/></>;
}
