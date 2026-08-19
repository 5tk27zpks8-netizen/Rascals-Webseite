import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./home-game-logos.css";
import "./schedule-compact.css";
import "./site-polish.css";
import "./image-position.css";
import "./rascals-standard-builder.css";
import "./legacy-builder.css";
import "./builder-background-mode.css";
import "./builder-footer-enhancer.css";
import { BuilderFooterEnhancer } from "./BuilderFooterEnhancer";
import { ImageFocusRuntime } from "./ImageFocusRuntime";
import { LegacyBuilderRuntime } from "./LegacyBuilderRuntime";
import { PublicAdminLogin } from "./PublicAdminLogin";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3001";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og-4k.jpg`;
  return {title:{default:"Hellenstein Rascals | American Football in Heidenheim",template:"%s | Hellenstein Rascals"},description:"Offizielle Teamseite der Hellenstein Rascals – Spielplan, Team, News, Galerie, Sponsoring und Fanshop.",icons:{icon:"/rascals-logo-transparent-4k.png",shortcut:"/rascals-logo-transparent-4k.png"},openGraph:{title:"Hellenstein Rascals | Hart. Echt. Rascals.",description:"American Football in Heidenheim – Team, Spielplan, News und Fanshop.",images:[{url:imageUrl,width:3840,height:2009,alt:"Hellenstein Rascals – Hart. Echt. Rascals."}],type:"website"},twitter:{card:"summary_large_image",title:"Hellenstein Rascals | Hart. Echt. Rascals.",description:"American Football in Heidenheim – Team, Spielplan, News und Fanshop.",images:[imageUrl]}};
}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="de"><body><ImageFocusRuntime/><LegacyBuilderRuntime/><BuilderFooterEnhancer/><PublicAdminLogin />{children}</body></html>}
