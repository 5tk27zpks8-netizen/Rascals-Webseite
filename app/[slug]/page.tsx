import { AboutTimeline } from "../AboutTimeline";
import { SiteBuilderGate } from "../SiteBuilderGate";
import { SiteShell, type PageName } from "../SiteShell";

const pages: PageName[] = ["ueber-uns", "team", "sponsoring", "shop", "news", "galerie"];

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const known = pages.includes(slug as PageName);
  const page = known ? (slug as PageName) : "home";
  const fallback = known
    ? <><SiteShell page={page} />{page === "ueber-uns" && <AboutTimeline />}</>
    : <main style={{minHeight:"70vh",display:"grid",placeItems:"center",background:"#050d18",color:"#fff",textAlign:"center",padding:"40px"}}><div><small style={{color:"#e7192d",fontWeight:900,letterSpacing:".18em"}}>404</small><h1>SEITE NICHT GEFUNDEN</h1><a href="/" style={{color:"#fff"}}>Zur Startseite →</a></div></main>;
  return <SiteBuilderGate slug={slug} fallback={fallback}/>;
}
