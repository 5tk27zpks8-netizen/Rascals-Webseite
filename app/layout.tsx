import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/archivo/standard.css";
import "@fontsource-variable/archivo/standard-italic.css";
/* First, so its tokens exist for everything below and nothing it defines
   can land on top of a rule that was already right. */
import "./responsive.css";
import "./rascals-design.css";
import "./rascals-motion.css";
import "./globals.css";
import "./home-game-logos.css";
import "./schedule-compact.css";
import "./image-position.css";
import "./rascals-standard-builder.css";
import "./legacy-builder.css";
import "./builder-background-mode.css";
import "./builder-footer-enhancer.css";
import "./site-polish.css";
import "./rascals-refresh.css";
/* Last, so the touch corrections win over the sheets they correct. */
import "./touch.css";
import { BuilderFooterEnhancer } from "./BuilderFooterEnhancer";
import { ImageFocusRuntime } from "./ImageFocusRuntime";
import { LegacyBuilderRuntime } from "./LegacyBuilderRuntime";
import { MobileTabBar } from "./MobileTabBar";
import { PublicAdminLogin } from "./PublicAdminLogin";
import { RascalsMotion } from "./RascalsMotion";

/**
 * `viewport-fit=cover` is the switch that makes a phone's own shape
 * addressable.
 *
 * Without it the page is laid out inside the safe rectangle: the notch, the
 * island and the home indicator are simply not the page's problem, and every
 * `env(safe-area-inset-*)` reads zero. That sounds safe and looks wrong — a
 * dark page gets a light band across the bottom where the indicator lives, and
 * a full-bleed photograph stops short of the top of the screen.
 *
 * With it the page fills the glass, which is what a phone app looks like, and
 * the insets start reporting real numbers. Everything fixed to an edge then
 * has to pad itself with them, or it ends up underneath the hardware — so the
 * two changes belong in the same commit, and do not make sense apart.
 *
 * `maximumScale` is deliberately not set: pinch zoom stays available.
 */
export const viewport: Viewport = {
  /* `viewport-fit` rides along inside `width` on purpose. The framework builds
     the meta tag from a fixed list of keys — width, height, initial-scale,
     minimum-scale, maximum-scale, user-scalable — and has no branch for
     `viewportFit`, so setting it the documented way produces nothing at all
     and fails silently, which is the worst kind of not working. Written here
     it lands in the same comma-separated list the spec asks for and the tag
     comes out exactly as `width=device-width, viewport-fit=cover,
     initial-scale=1`. Verified against the served HTML, not assumed. */
  width: "device-width, viewport-fit=cover",
  initialScale: 1,
  themeColor: "#050d18",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3001";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og-4k.jpg`;
  return {title:{default:"Hellenstein Rascals | American Football in Heidenheim",template:"%s | Hellenstein Rascals"},description:"Offizielle Teamseite der Hellenstein Rascals – Spielplan, Team, News, Galerie, Sponsoring und Fanshop.",icons:{icon:"/rascals-icon-192.png",shortcut:"/rascals-icon-192.png"},openGraph:{title:"Hellenstein Rascals | Hart. Echt. Rascals.",description:"American Football in Heidenheim – Team, Spielplan, News und Fanshop.",images:[{url:imageUrl,width:3840,height:2009,alt:"Hellenstein Rascals – Hart. Echt. Rascals."}],type:"website"},twitter:{card:"summary_large_image",title:"Hellenstein Rascals | Hart. Echt. Rascals.",description:"American Football in Heidenheim – Team, Spielplan, News und Fanshop.",images:[imageUrl]}};
}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="de" className="no-js"><body><RascalsMotion/><ImageFocusRuntime/><LegacyBuilderRuntime/><BuilderFooterEnhancer/><PublicAdminLogin />{children}<MobileTabBar /></body></html>}
