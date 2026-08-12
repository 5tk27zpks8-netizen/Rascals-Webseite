import { CmsHero } from "./CmsHero";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { HomeSectionMedia } from "./HomeSectionMedia";
import { SiteBuilderGate } from "./SiteBuilderGate";
import { SiteShell } from "./SiteShell";

export default function Home(){
  return <SiteBuilderGate slug="" fallback={<><CmsHero/><SiteShell page="home"/><DynamicHomeFeeds/><DynamicHomeGames/><HomeSectionMedia/></>}/>;
}
