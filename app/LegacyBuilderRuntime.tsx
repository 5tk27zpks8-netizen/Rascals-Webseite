"use client";

import { useEffect } from "react";

const SHOP_URL = "https://hellenstein-rascals.myshopify.com";

function ensureAnchor(parent: Element | null, selector: string, href: string, className: string, label: string) {
  if (!parent || parent.querySelector(selector)) return;
  const link = document.createElement("a");
  link.href = href;
  link.className = className;
  link.textContent = label;
  if (href.startsWith("http")) {
    link.target = "_blank";
    link.rel = "noreferrer";
  }
  parent.appendChild(link);
}

function enhance() {
  document.querySelectorAll(".sb-hero.sb-variant-legacy-home .sb-hero-copy").forEach((node) => {
    ensureAnchor(node, ".sb-legacy-secondary", "/spielplan", "sb-legacy-secondary", "SPIELPLAN 2026  →");
  });
  document.querySelectorAll(".sb-cards-section.sb-variant-legacy-shop .sb-section-head").forEach((node) => {
    ensureAnchor(node, ".sb-legacy-shop-link", SHOP_URL, "sb-legacy-shop-link", "ZUM RASCALS SHOP  ↗");
  });
}

export function LegacyBuilderRuntime() {
  useEffect(() => {
    enhance();
    const observer = new MutationObserver(() => enhance());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
