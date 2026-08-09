"use client";

import { usePathname } from "next/navigation";

export function PublicAdminLogin() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <a
      href="/admin"
      aria-label="Zum Rascals OS Admin Login"
      style={{
        position: "fixed",
        top: 92,
        right: "clamp(16px, 4vw, 64px)",
        zIndex: 95,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minHeight: 38,
        padding: "0 14px",
        border: "1px solid rgba(255,255,255,.24)",
        borderRadius: 999,
        background: "rgba(4,13,25,.82)",
        color: "#fff",
        boxShadow: "0 8px 28px rgba(0,0,0,.24)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontSize: ".68rem",
        fontWeight: 900,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        textDecoration: "none",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: ".9rem", lineHeight: 1 }}>⌁</span>
      Anmelden
    </a>
  );
}
