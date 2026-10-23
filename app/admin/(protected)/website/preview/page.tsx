import { SiteBuilderPage } from "../../../../SiteBuilderPage";
import { findBuilderPage, readSiteBuilderState } from "../../../../lib/site-builder";

export const metadata = {
  title: "Vorschau · Rascals Website Studio",
  robots: { index: false, follow: false },
};

export default async function WebsiteDraftPreview({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const { slug = "" } = await searchParams;
  const state = await readSiteBuilderState();
  const page = findBuilderPage(state, slug) ?? state.pages[0];

  if (!page) {
    return (
      <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#050d18",color:"#fff",padding:32,textAlign:"center"}}>
        <div><small style={{color:"#e7192d",fontWeight:900,letterSpacing:".16em"}}>VORSCHAU</small><h1>Keine Seite vorhanden</h1><a href="/admin/website" style={{color:"#fff"}}>Zurück zum Website Studio →</a></div>
      </main>
    );
  }

  return (
    <div>
      <div style={{position:"fixed",zIndex:9999,left:16,right:16,bottom:16,display:"flex",gap:8,alignItems:"center",padding:"8px",border:"1px solid rgba(255,255,255,.16)",borderRadius:16,background:"rgba(4,11,19,.9)",backdropFilter:"blur(16px)",color:"#fff",fontSize:11,fontWeight:900,boxShadow:"0 12px 34px rgba(0,0,0,.3)",overflowX:"auto"}}>
        <span style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",whiteSpace:"nowrap"}}><i style={{display:"block",width:7,height:7,borderRadius:"50%",background:"#f1b44c"}} /> ENTWURF</span>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>{state.pages.map(item => <a key={item.id} href={`/admin/website/preview?slug=${encodeURIComponent(item.slug)}`} style={{padding:"7px 10px",borderRadius:9,background:item.id===page.id?"#213249":"transparent",color:"#fff",textDecoration:"none",whiteSpace:"nowrap",opacity:item.id===page.id?1:.68}}>{item.name}</a>)}</div>
        <a href="/admin/website" style={{marginLeft:"auto",padding:"7px 10px",color:"#fff",textDecoration:"none",opacity:.8,whiteSpace:"nowrap"}}>Editor ↗</a>
      </div>
      <SiteBuilderPage state={state} page={page} />
    </div>
  );
}
