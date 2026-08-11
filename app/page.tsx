import { CmsHero } from "./CmsHero";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { DynamicHomeGames } from "./DynamicHomeGames";
import { HomeSectionMedia } from "./HomeSectionMedia";
import { SiteShell } from "./SiteShell";
export default function Home(){return <><CmsHero/><SiteShell page="home"/><DynamicHomeFeeds/><DynamicHomeGames/><HomeSectionMedia/></>}
