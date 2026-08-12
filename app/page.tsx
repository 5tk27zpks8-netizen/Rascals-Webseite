import { CmsHero } from "./CmsHero";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { HomeSectionMedia } from "./HomeSectionMedia";
import { SiteBuilderPage } from "./SiteBuilderPage";
import { SiteShell } from "./SiteShell";
import { findBuilderPage, readPublishedSiteBuilderState } from "./lib/site-builder";

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

export default async function Home() {
  const state = await readPublishedSiteBuilderState();
  const builderPage = findBuilderPage(state, "");

  if (builderPage?.enabled) {
    return <SiteBuilderPage state={state} page={builderPage} />;
  }

  return <><CmsHero/><SiteShell page="home"/><DynamicHomeFeeds/><DynamicHomeGames/><HomeSectionMedia/></>;
}
