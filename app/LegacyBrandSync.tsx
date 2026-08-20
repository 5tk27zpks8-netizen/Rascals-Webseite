"use client";

import { useLayoutEffect } from "react";

const LEGACY_LOGO_SELECTORS = [
  ".site-header .brand img",
  "footer .footer-brand img",
];

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

    const apply = () => {
      for (const selector of LEGACY_LOGO_SELECTORS) {
        document.querySelectorAll<HTMLImageElement>(selector).forEach((image) => {
          if (image.getAttribute("src") !== src) image.setAttribute("src", src);
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
