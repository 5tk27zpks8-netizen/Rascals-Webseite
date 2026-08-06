import { CmsHero } from "./CmsHero";
import { SiteShell } from "./SiteShell";

export default function Home() {
  return (
    <>
      <CmsHero />
      <SiteShell page="home" />
    </>
  );
}
