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

    const footerColumns = Array.from(document.querySelectorAll<HTMLElement>("footer > div"));
    const homeField = footerColumns.find((column) =>
      column.querySelector(":scope > b")?.textContent?.trim() === "HOME FIELD"
    );

    setTarget(homeField ?? null);
  }, [pathname]);

  if (pathname?.startsWith("/admin") || !target) return null;

  return createPortal(
    <a href="/admin" aria-label="Zum Admin Login" className="public-admin-login">
      Login
    </a>,
    target,
  );
}
