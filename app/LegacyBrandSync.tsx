"use client";

import { useLayoutEffect } from "react";

const LEGACY_LOGO_SELECTORS = [
  ".site-header .brand img",
  "footer .footer-brand img",
];

const STYLE_ID = "legacy-builder-header-unifier";

const unifiedHeaderCss = `
.site-header.legacy-unified-header{
  position:sticky!important;
  inset:auto!important;
  top:0!important;
  z-index:90!important;
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  height:auto!important;
  min-height:112px!important;
  padding:0 4vw!important;
  border-bottom:1px solid rgba(255,255,255,.08)!important;
  background:#050d18!important;
  color:#fff!important;
  backdrop-filter:blur(18px)!important;
  -webkit-backdrop-filter:blur(18px)!important;
}
.site-header.legacy-unified-header .brand{
  display:flex!important;
  align-items:center!important;
  gap:12px!important;
  min-width:0!important;
  color:inherit!important;
  text-decoration:none!important;
  transform:none!important;
}
.site-header.legacy-unified-header .brand img{
  width:96px!important;
  height:96px!important;
  flex:0 0 96px!important;
  max-width:none!important;
  object-fit:contain!important;
}
.site-header.legacy-unified-header .brand span{
  display:grid!important;
  justify-items:start!important;
  line-height:.9!important;
  letter-spacing:0!important;
  text-align:left!important;
}
.site-header.legacy-unified-header .brand strong{
  width:auto!important;
  color:#fff!important;
  font-family:Inter,Arial,sans-serif!important;
  font-size:.72rem!important;
  font-weight:950!important;
  line-height:1!important;
  letter-spacing:.16em!important;
  text-align:left!important;
  text-transform:uppercase!important;
}
.site-header.legacy-unified-header .brand em{
  color:#e7192d!important;
  font-family:Inter,Arial,sans-serif!important;
  font-size:1.1rem!important;
  font-style:italic!important;
  font-weight:950!important;
  line-height:1!important;
  letter-spacing:0!important;
  text-transform:uppercase!important;
}
.site-header.legacy-unified-header .main-nav{
  display:flex!important;
  align-items:center!important;
  gap:26px!important;
}
.site-header.legacy-unified-header .main-nav a{
  position:relative!important;
  padding:0!important;
  color:inherit!important;
  font-family:Inter,Arial,sans-serif!important;
  font-size:.72rem!important;
  font-weight:900!important;
  line-height:1!important;
  letter-spacing:.08em!important;
  text-decoration:none!important;
  text-transform:uppercase!important;
}
.site-header.legacy-unified-header .main-nav a:not(.nav-cta)::after{
  display:none!important;
}
.site-header.legacy-unified-header .main-nav a.active{
  color:#e7192d!important;
}
.site-header.legacy-unified-header .main-nav .nav-cta{
  padding:11px 16px!important;
  border:1px solid #e7192d!important;
  border-radius:0!important;
  background:#e7192d!important;
  color:#fff!important;
  box-shadow:0 8px 22px rgba(231,25,45,.22)!important;
  transform:none!important;
}
@media(max-width:780px){
  .site-header.legacy-unified-header{
    min-height:88px!important;
    padding:0 18px!important;
  }
  .site-header.legacy-unified-header .brand img{
    width:74px!important;
    height:74px!important;
    flex-basis:74px!important;
  }
  .site-header.legacy-unified-header .brand strong{font-size:.62rem!important;}
  .site-header.legacy-unified-header .brand em{font-size:.96rem!important;}
}
`;

type LegacyBrandSyncProps = {
  logoUrl: string;
  brandTop?: string;
  brandBottom?: string;
  navCtaLabel?: string;
  navCtaUrl?: string;
};

export function LegacyBrandSync({ logoUrl, brandTop, brandBottom, navCtaLabel, navCtaUrl }: LegacyBrandSyncProps) {
  useLayoutEffect(() => {
    const src = logoUrl?.trim() || "/rascals-logo-transparent-4k.png";
    const top = brandTop?.trim() || "HELLENSTEIN";
    const bottom = brandBottom?.trim() || "RASCALS";
    const ctaLabel = navCtaLabel?.trim() || "Mitmachen";
    const ctaUrl = navCtaUrl?.trim() || "mailto:football@hsb1846.de";

    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    if (style.textContent !== unifiedHeaderCss) style.textContent = unifiedHeaderCss;

    const apply = () => {
      document.querySelectorAll<HTMLElement>(".site-header").forEach((header) => {
        header.classList.add("legacy-unified-header");
        header.style.setProperty("background", "#050d18", "important");
        header.style.setProperty("min-height", "112px", "important");
        header.style.setProperty("height", "auto", "important");
      });

      document.querySelectorAll<HTMLAnchorElement>(".site-header .brand").forEach((brand) => {
        brand.classList.add("legacy-unified-brand");
      });

      for (const selector of LEGACY_LOGO_SELECTORS) {
        document.querySelectorAll<HTMLImageElement>(selector).forEach((image) => {
          if (image.getAttribute("src") !== src) image.setAttribute("src", src);
          image.style.setProperty("width", selector.includes("footer") ? "255px" : "96px", "important");
          image.style.setProperty("height", selector.includes("footer") ? "auto" : "96px", "important");
          image.style.setProperty("object-fit", "contain", "important");
        });
      }

      document.querySelectorAll<HTMLElement>(".site-header .brand strong").forEach((node) => {
        if (node.textContent !== top) node.textContent = top;
      });
      document.querySelectorAll<HTMLElement>(".site-header .brand em").forEach((node) => {
        if (node.textContent !== bottom) node.textContent = bottom;
      });
      document.querySelectorAll<HTMLAnchorElement>(".site-header .nav-cta").forEach((link) => {
        if (link.textContent !== ctaLabel) link.textContent = ctaLabel;
        if (link.getAttribute("href") !== ctaUrl) link.setAttribute("href", ctaUrl);
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    return () => observer.disconnect();
  }, [logoUrl, brandTop, brandBottom, navCtaLabel, navCtaUrl]);

  return null;
}
