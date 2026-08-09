"use client";

import { usePathname } from "next/navigation";

export function PublicAdminLogin() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <a
      href="/admin"
      aria-label="Zum Rascals OS Admin Login"
      className="public-admin-login"
    >
      <span aria-hidden="true">⌁</span>
      <b>Anmelden</b>
      <style jsx>{`
        .public-admin-login {
          position: fixed;
          top: 92px;
          right: clamp(16px, 4vw, 64px);
          z-index: 160;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 14px;
          border: 1px solid rgba(255,255,255,.28);
          border-radius: 999px;
          background: rgba(4,13,25,.9);
          color: #fff;
          box-shadow: 0 8px 28px rgba(0,0,0,.28);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          font-size: .68rem;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
          text-decoration: none;
        }
        .public-admin-login span {
          font-size: .9rem;
          line-height: 1;
        }
        .public-admin-login b {
          font: inherit;
        }
        @media (max-width: 760px) {
          .public-admin-login {
            top: 86px;
            right: 12px;
            z-index: 180;
            min-width: 44px;
            min-height: 44px;
            padding: 0 12px;
            background: rgba(7,23,43,.96);
            border-color: rgba(255,255,255,.38);
            box-shadow: 0 10px 32px rgba(0,0,0,.36);
          }
        }
        @media (max-width: 420px) {
          .public-admin-login {
            right: 10px;
            top: 84px;
            padding: 0 11px;
            gap: 6px;
          }
          .public-admin-login b {
            font-size: .62rem;
            letter-spacing: .08em;
          }
        }
      `}</style>
    </a>
  );
}
