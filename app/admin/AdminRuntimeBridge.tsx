"use client";

import { useEffect } from "react";

const protectedApiMap: Record<string, string> = {
  "/api/cms": "/admin/api/cms",
  "/api/media": "/admin/api/media",
  "/api/news": "/admin/api/news",
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

export function AdminRuntimeBridge() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === "string") {
        return nativeFetch(rewriteUrl(input), init);
      }

      if (input instanceof URL) {
        return nativeFetch(new URL(rewriteUrl(input.toString()), window.location.origin), init);
      }

      if (input instanceof Request) {
        const rewritten = rewriteUrl(input.url);
        if (rewritten !== input.url) {
          return nativeFetch(new Request(rewritten, input), init);
        }
      }

      return nativeFetch(input, init);
    }) as typeof window.fetch;

    const activateNewsLink = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".admin-sidebar nav button"));
      const newsButton = buttons.find((button) => button.textContent?.includes("News"));
      if (!newsButton) return;
      newsButton.disabled = false;
      newsButton.style.cursor = "pointer";
      newsButton.onclick = () => { window.location.href = "/admin/news"; };
      const phase = newsButton.querySelector("em");
      if (phase) phase.textContent = "LIVE";
    };

    const frame = window.requestAnimationFrame(activateNewsLink);

    return () => {
      window.cancelAnimationFrame(frame);
      window.fetch = nativeFetch;
    };
  }, []);

  return null;
}
