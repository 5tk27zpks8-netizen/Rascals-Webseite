import { AboutTimeline } from "../AboutTimeline";
import { SiteBuilderPage } from "../SiteBuilderPage";
import { SiteShell, type PageName } from "../SiteShell";
import { findBuilderPage, readSiteBuilderState } from "../lib/site-builder";

const legacyPages: PageName[] = ["ueber-uns", "team", "sponsoring", "shop", "news", "galerie"];

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await readSiteBuilderState();
  const builderPage = findBuilderPage(state, slug);

  if (builderPage?.enabled) {
    return <SiteBuilderPage state={state} page={builderPage} />;
  }

  if (legacyPages.includes(slug as PageName)) {
    const page = slug as PageName;
    return <><SiteShell page={page} />{page === "ueber-uns" && <AboutTimeline />}</>;
  }

  return (
    <main style={{minHeight:"70vh",display:"grid",placeItems:"center",background:"#050d18",color:"#fff",textAlign:"center",padding:"40px"}}>
      <div><small style={{color:"#e7192d",fontWeight:900,letterSpacing:".18em"}}>404</small><h1>SEITE NICHT GEFUNDEN</h1><a href="/" style={{color:"#fff"}}>Zur Startseite →</a></div>
    </main>
  );
}
