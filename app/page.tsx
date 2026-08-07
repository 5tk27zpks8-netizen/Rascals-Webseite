import { CmsHero } from "./CmsHero";
import { DynamicHomeFeeds } from "./DynamicHomeFeeds";
import { SiteShell } from "./SiteShell";

export default function Home() {
  return (
    <>
      <CmsHero />
      <SiteShell page="home" />
      <DynamicHomeFeeds />
    </>
  );
}
