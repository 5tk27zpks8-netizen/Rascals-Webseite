"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const nav = [
  ["Über uns", "/ueber-uns"],
  ["Team", "/team"],
  ["Sponsoring", "/sponsoring"],
  ["Shop", "/shop"],
  ["News", "/news"],
  ["Galerie", "/galerie"],
] as const;

const IMPRESSUM_URL = "https://hsb1846.de/home/impressum/";
const DATENSCHUTZ_URL = "https://hsb1846.de/home/datenschutzerklaerung-2/";

export function BuilderFooterEnhancer() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [footerTitle, setFooterTitle] = useState("HELLENSTEIN RASCALS");
  const [footerSubtitle, setFooterSubtitle] = useState("American Football · Heidenheim");

  useEffect(() => {
    let currentFooter: HTMLElement | null = null;
    let currentSlot: HTMLElement | null = null;

    const sync = () => {
      const footer = document.querySelector<HTMLElement>("footer.sb-footer");
      if (!footer) {
        if (currentFooter) currentFooter.classList.remove("sb-footer-full");
        currentFooter = null;
        currentSlot = null;
        setTarget(null);
        return;
      }

      const title = footer.querySelector<HTMLElement>(":scope > span")?.textContent?.trim();
      const subtitle = footer.querySelector<HTMLElement>(":scope > small")?.textContent?.trim();
      if (title) setFooterTitle(title);
      if (subtitle) setFooterSubtitle(subtitle);

      if (footer !== currentFooter) {
        currentFooter?.classList.remove("sb-footer-full");
        currentFooter = footer;
        footer.classList.add("sb-footer-full");
      }

      let slot = footer.querySelector<HTMLElement>(":scope > .sb-footer-enhancer-slot");
      if (!slot) {
        slot = document.createElement("div");
        slot.className = "sb-footer-enhancer-slot";
        footer.appendChild(slot);
      }
      if (slot !== currentSlot) {
        currentSlot = slot;
        setTarget(slot);
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { subtree: true, childList: true });
    return () => {
      observer.disconnect();
      currentFooter?.classList.remove("sb-footer-full");
      setTarget(null);
    };
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="sb-footer-grid" data-builder-theme="footer">
      <div className="sb-footer-brand-block">
        <img src="/rascals-logo-transparent-4k.png" alt="Hellenstein Rascals" />
        <a href="/admin" aria-label="Zum Admin Login" className="public-admin-login sb-footer-login">Anmelden</a>
        <p>{footerSubtitle || "American Football in Heidenheim."}<br />Eine Abteilung des Heidenheimer Sportbund 1846 e.V.</p>
      </div>

      <div className="sb-footer-column">
        <b>EXPLORE</b>
        {nav.map(([label, href]) => <a key={href} href={href}>{label}</a>)}
      </div>

      <div className="sb-footer-column">
        <b>FOLLOW</b>
        <a href="https://www.instagram.com/hellenstein_rascals/" target="_blank" rel="noreferrer">Instagram ↗</a>
        <a href="https://www.facebook.com/HellensteinRascals/" target="_blank" rel="noreferrer">Facebook ↗</a>
        <a href="mailto:football@hsb1846.de">E-Mail ↗</a>
      </div>

      <div className="sb-footer-column">
        <b>HOME FIELD</b>
        <p>Heeracker 22<br />89522 Heidenheim</p>
        <a href={IMPRESSUM_URL} target="_blank" rel="noreferrer">Impressum ↗</a>
        <a href={DATENSCHUTZ_URL} target="_blank" rel="noreferrer">Datenschutz ↗</a>
      </div>

      <small>© 2026 {footerTitle || "HELLENSTEIN RASCALS"} · ALL GRIT. ALL HEART.</small>
    </div>,
    target,
  );
}
