"use client";

import { useEffect } from "react";

const LEGACY_LOGO_SELECTORS = [
  ".site-header .brand img",
  "footer .footer-brand img",
];

export function LegacyBrandSync({ logoUrl }: { logoUrl: string }) {
  useEffect(() => {
    const src = logoUrl?.trim() || "/rascals-logo-transparent-4k.png";

    const apply = () => {
      for (const selector of LEGACY_LOGO_SELECTORS) {
        document.querySelectorAll<HTMLImageElement>(selector).forEach((image) => {
          if (image.getAttribute("src") !== src) image.setAttribute("src", src);
        });
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, [logoUrl]);

  return null;
}
