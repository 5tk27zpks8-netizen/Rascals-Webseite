"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#07101d",color:"white",padding:"24px",textAlign:"center"}}><div><img src="/rascals-logo-transparent-4k.png" alt="" style={{width:110,height:110,objectFit:"contain"}}/><p style={{letterSpacing:".16em",color:"#9e210f",fontWeight:900}}>TECHNICAL TIMEOUT</p><h1 style={{fontSize:"clamp(42px,8vw,90px)",margin:"10px 0"}}>ETWAS IST SCHIEF GELAUFEN.</h1><p style={{color:"#aeb8c5",maxWidth:560,margin:"0 auto 24px"}}>Bitte lade die Seite erneut. Falls der Fehler bestehen bleibt, kann der Administrator die Cloudflare-Logs prüfen.</p><button onClick={reset} style={{padding:"12px 18px",border:0,borderRadius:8,background:"#9e210f",color:"white",fontWeight:900,cursor:"pointer"}}>Erneut versuchen</button></div></main>;
}
