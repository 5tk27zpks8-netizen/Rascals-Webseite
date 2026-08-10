"use client";

import { usePathname } from "next/navigation";
import "./public-admin-login.css";

export function PublicAdminLogin() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <a href="/admin" aria-label="Zum Rascals OS Admin Login" className="public-admin-login">
      <span aria-hidden="true">🔒</span>
      <b>Anmelden</b>
    </a>
  );
}
