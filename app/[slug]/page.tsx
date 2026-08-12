import { AboutTimeline } from "../AboutTimeline";
import { SiteShell, type PageName } from "../SiteShell";

const pages: PageName[] = ["ueber-uns", "team", "sponsoring", "shop", "news", "galerie"];

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages.includes(slug as PageName) ? (slug as PageName) : "home";
  return <><SiteShell page={page} />{page === "ueber-uns" && <AboutTimeline />}</>;
}
