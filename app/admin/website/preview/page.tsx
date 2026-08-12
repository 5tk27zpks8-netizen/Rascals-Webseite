import { requireChatGPTUser } from "../../../chatgpt-auth";
import { SiteBuilderPage } from "../../../SiteBuilderPage";
import { findBuilderPage, readSiteBuilderState } from "../../../lib/site-builder";

export const metadata = {
  title: "Vorschau · Rascals Website Studio",
  robots: { index: false, follow: false },
};

export default async function WebsiteDraftPreview({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  await requireChatGPTUser("/admin/website/preview");
  const { slug = "" } = await searchParams;
  const state = await readSiteBuilderState();
  const page = findBuilderPage(state, slug);

  if (!page) {
    return (
      <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#050d18",color:"#fff",padding:32,textAlign:"center"}}>
        <div><small style={{color:"#e7192d",fontWeight:900,letterSpacing:".16em"}}>VORSCHAU</small><h1>Seite nicht gefunden</h1><a href="/admin/website" style={{color:"#fff"}}>Zurück zum Website Studio →</a></div>
      </main>
    );
  }

  return (
    <div>
      <div style={{position:"fixed",zIndex:9999,left:16,bottom:16,display:"flex",gap:8,alignItems:"center",padding:"9px 12px",border:"1px solid rgba(255,255,255,.16)",borderRadius:999,background:"rgba(4,11,19,.88)",backdropFilter:"blur(14px)",color:"#fff",fontSize:11,fontWeight:900,boxShadow:"0 12px 34px rgba(0,0,0,.3)"}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:"#f1b44c"}} /> ENTWURF-VORSCHAU
        <a href="/admin/website" style={{marginLeft:4,color:"#fff",textDecoration:"none",opacity:.75}}>Editor ↗</a>
      </div>
      <SiteBuilderPage state={state} page={page} />
    </div>
  );
}
