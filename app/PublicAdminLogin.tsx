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
      <span aria-hidden="true">🔒</span>
      <b>Anmelden</b>
      <style jsx>{`
        .public-admin-login {
          position: fixed;
          top: 92px;
          right: clamp(16px, 4vw, 64px);
          z-index: 9999;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 15px;
          border: 1px solid rgba(255,255,255,.32);
          border-radius: 999px;
          background: #07172b;
          color: #fff;
          box-shadow: 0 10px 30px rgba(0,0,0,.32);
          font-size: .68rem;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
          text-decoration: none;
          isolation: isolate;
        }
        .public-admin-login span {
          font-size: .82rem;
          line-height: 1;
        }
        .public-admin-login b { font: inherit; }

        @media (max-width: 760px) {
          .public-admin-login {
            top: auto;
            right: 14px;
            bottom: calc(18px + env(safe-area-inset-bottom));
            z-index: 2147483000;
            min-width: 118px;
            min-height: 48px;
            padding: 0 16px;
            border: 2px solid rgba(255,255,255,.9);
            background: #9e210f;
            color: #fff;
            box-shadow: 0 12px 36px rgba(0,0,0,.48);
            font-size: .7rem;
          }
        }

        @media (max-width: 420px) {
          .public-admin-login {
            right: 12px;
            bottom: calc(14px + env(safe-area-inset-bottom));
            min-width: 112px;
            min-height: 46px;
            padding: 0 14px;
          }
        }
      `}</style>
    </a>
  );
}
