"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import "./public-admin-login.css";

export function PublicAdminLogin() {
  const pathname = usePathname();
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (pathname?.startsWith("/admin")) {
      setTarget(null);
      return;
    }

    const footerBrand = document.querySelector<HTMLElement>("footer .footer-brand");
    const logo = footerBrand?.querySelector<HTMLImageElement>(":scope > img");
    if (!footerBrand || !logo) {
      setTarget(null);
      return;
    }

    let slot = footerBrand.querySelector<HTMLElement>(":scope > .footer-admin-login-slot");
    if (!slot) {
      slot = document.createElement("div");
      slot.className = "footer-admin-login-slot";
      logo.insertAdjacentElement("afterend", slot);
    }

    setTarget(slot);

    return () => {
      setTarget(null);
      slot?.remove();
    };
  }, [pathname]);

  if (pathname?.startsWith("/admin") || !target) return null;

  return createPortal(
    <a href="/admin" aria-label="Zum Admin Login" className="public-admin-login">
      Anmelden
    </a>,
    target,
  );
}
