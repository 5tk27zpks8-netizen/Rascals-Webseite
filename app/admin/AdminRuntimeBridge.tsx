"use client";

import { useEffect } from "react";

const protectedApiMap: Record<string, string> = {
  "/api/cms": "/admin/api/cms",
  "/api/media": "/admin/api/media",
  "/api/news": "/admin/api/news",
  "/api/sponsors": "/admin/api/sponsors",
};

function rewriteUrl(input: string) {
  const url = new URL(input, window.location.origin);
  for (const [from, to] of Object.entries(protectedApiMap)) {
    if (url.pathname === from) {
      url.pathname = to;
      return url.pathname + url.search + url.hash;
    }
  }
  return input;
}

function activateSidebarLink(label: string, href: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".admin-sidebar nav button"));
  const button = buttons.find((item) => item.textContent?.includes(label));
  if (!button) return false;

  button.disabled = false;
  button.removeAttribute("disabled");
  button.style.cursor = "pointer";
  button.style.opacity = "1";
  button.onclick = () => { window.location.href = href; };

  const phase = button.querySelector("em");
  if (phase) phase.textContent = "LIVE";
  return true;
}

export function AdminRuntimeBridge() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === "string") return nativeFetch(rewriteUrl(input), init);
      if (input instanceof URL) return nativeFetch(new URL(rewriteUrl(input.toString()), window.location.origin), init);
      if (input instanceof Request) {
        const rewritten = rewriteUrl(input.url);
        if (rewritten !== input.url) return nativeFetch(new Request(rewritten, input), init);
      }
      return nativeFetch(input, init);
    }) as typeof window.fetch;

    let attempts = 0;
    const activate = () => {
      const newsReady = activateSidebarLink("News", "/admin/news");
      const sponsorsReady = activateSidebarLink("Sponsoren", "/admin/sponsors");
      attempts += 1;
      if ((newsReady && sponsorsReady) || attempts >= 20) {
        window.clearInterval(timer);
      }
    };

    activate();
    const timer = window.setInterval(activate, 250);

    return () => {
      window.clearInterval(timer);
      window.fetch = nativeFetch;
    };
  }, []);

  return null;
}
