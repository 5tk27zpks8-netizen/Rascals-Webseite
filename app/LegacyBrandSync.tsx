"use client";

import { useLayoutEffect } from "react";

const LEGACY_LOGO_SELECTORS = [
  ".site-header .brand img",
  "footer .footer-brand img",
];

const STYLE_ID = "legacy-builder-header-unifier";

function setStyleIfChanged(element: HTMLElement, property: string, value: string, priority: "important") {
  if (element.style.getPropertyValue(property) !== value) element.style.setProperty(property, value, priority);
}

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
  min-height:96px!important;
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
  /* Same gap as the builder lockup: at 12px the wordmark sat 3px closer to the
     mark here than it does on the homepage. */
  gap:15px!important;
  min-width:0!important;
  color:inherit!important;
  text-decoration:none!important;
  transform:none!important;
}
.site-header.legacy-unified-header .brand img{
  width:auto!important;
  height:78px!important;
  flex:0 0 auto!important;
  max-width:140px!important;
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
  font-family:var(--font-display,Inter,Arial,sans-serif)!important;
  font-size:.84rem!important;
  font-weight:950!important;
  letter-spacing:.18em!important;
  text-align:left!important;
  text-transform:uppercase!important;
}
.site-header.legacy-unified-header .brand em{
  color:#e7192d!important;
  font-family:var(--font-display,Inter,Arial,sans-serif)!important;
  font-size:1.9rem!important;
  font-style:italic!important;
  font-weight:950!important;
  letter-spacing:-.01em!important;
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
@media(max-width:900px){
  .site-header.legacy-unified-header{
    min-height:78px!important;
    padding:0 18px!important;
  }
  .site-header.legacy-unified-header .brand img{
    width:auto!important;
    height:58px!important;
    flex-basis:auto!important;
    max-width:104px!important;
  }
  .site-header.legacy-unified-header .brand strong{font-size:.76rem!important;letter-spacing:.16em!important;}
  .site-header.legacy-unified-header .brand em{font-size:1.45rem!important;}

  /* THE NAV HAS TO COLLAPSE AGAIN.

     The rule further up forces display:flex with no media query at all. That
     is right for a desktop bar and wrong everywhere else, and because it
     carries !important nothing in the shared stylesheets could take it back:
     on a phone every legacy page loaded with its menu already open, a column
     of links shoving the page's own content three hundred and fifty pixels
     down, while the burger button sat above it doing nothing at all.

     This restores the same behaviour the builder pages have — hidden until
     the button says otherwise — and gives the links a target a thumb can hit
     rather than the zero padding the desktop bar wants. */
  .site-header.legacy-unified-header{
    position:relative!important;
  }
  .site-header.legacy-unified-header .main-nav{
    position:absolute!important;
    left:0!important;
    right:0!important;
    top:100%!important;
    display:none!important;
    flex-direction:column!important;
    align-items:stretch!important;
    gap:0!important;
    padding:10px 18px calc(18px + env(safe-area-inset-bottom, 0px))!important;
    background:#050d18!important;
    border-bottom:1px solid rgba(255,255,255,.12)!important;
  }
  .site-header.legacy-unified-header .main-nav.open{
    display:flex!important;
  }
  .site-header.legacy-unified-header .main-nav a{
    display:block!important;
    padding:13px 0!important;
    font-size:.82rem!important;
    line-height:1.2!important;
  }
  .site-header.legacy-unified-header .main-nav .nav-cta{
    margin-top:10px!important;
    text-align:center!important;
  }
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
        setStyleIfChanged(header, "background", "#050d18", "important");
        setStyleIfChanged(header, "min-height", "96px", "important");
        setStyleIfChanged(header, "height", "auto", "important");
      });

      document.querySelectorAll<HTMLAnchorElement>(".site-header .brand").forEach((brand) => {
        brand.classList.add("legacy-unified-brand");
      });

      /* Only the source is synced here. Size is deliberately NOT set inline:
         an inline !important beats every stylesheet, so doing it here pinned
         the subpage lockup to a square 62px and silently overrode the shared
         header spec in site-polish.css. The size has one home now. */
      for (const selector of LEGACY_LOGO_SELECTORS) {
        document.querySelectorAll<HTMLImageElement>(selector).forEach((image) => {
          if (image.getAttribute("src") !== src) image.setAttribute("src", src);
          setStyleIfChanged(image, "object-fit", "contain", "important");
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
    observer.observe(document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [logoUrl, brandTop, brandBottom, navCtaLabel, navCtaUrl]);

  return null;
}
