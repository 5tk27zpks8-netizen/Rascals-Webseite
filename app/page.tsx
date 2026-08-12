import { CmsHero } from "./CmsHero";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { HomeSectionMedia } from "./HomeSectionMedia";
import { SiteBuilderPage } from "./SiteBuilderPage";
import { SiteShell } from "./SiteShell";
import { findBuilderPage, readSiteBuilderState } from "./lib/site-builder";

export default async function Home() {
  const state = await readSiteBuilderState();
  const builderPage = findBuilderPage(state, "");

  if (builderPage?.enabled) {
    return <SiteBuilderPage state={state} page={builderPage} />;
  }

  return <><CmsHero/><SiteShell page="home"/><DynamicHomeFeeds/><DynamicHomeGames/><HomeSectionMedia/></>;
}
