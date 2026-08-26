"use client";

import { useEffect, useRef } from "react";

function findDraftSaveButton() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
    .find(button => button.textContent?.trim().toLowerCase().includes("entwurf speichern"));
}

function reloadMirror() {
  const frame = document.querySelector<HTMLIFrameElement>(".wb-live-mirror-frame");
  if (!frame) return;
  try {
    const url = new URL(frame.src, window.location.origin);
    url.searchParams.set("studio_mirror", "1");
    url.searchParams.set("studio_refresh", String(Date.now()));
    frame.src = `${url.pathname}${url.search}`;
  } catch {
    frame.contentWindow?.location.reload();
  }
}

export function LiveDraftSyncAddon() {
  const busy = useRef(false);
  const lastReload = useRef(0);

  useEffect(() => {
    let stopped = false;

    const syncIfDirty = () => {
      if (stopped || busy.current) return;
      const button = findDraftSaveButton();
      if (!button || button.disabled) return;

      busy.current = true;
      button.click();
      const started = Date.now();

      const waitForCompletion = () => {
        if (stopped) return;
        const current = findDraftSaveButton();
        const elapsed = Date.now() - started;

        // During save the button is disabled; after save it remains disabled
        // because the Builder is clean again. Only then refresh the mirror.
        const complete = Boolean(current && current.disabled && elapsed > 140);
        if (complete || elapsed > 4000) {
          busy.current = false;
          const now = Date.now();
          if (now - lastReload.current > 120) {
            lastReload.current = now;
            reloadMirror();
          }
          return;
        }
        window.setTimeout(waitForCompletion, 60);
      };

      window.setTimeout(waitForCompletion, 80);
    };

    // React can mark the Builder dirty after the originating input event has
    // already finished. Watching the actual enabled state of the canonical save
    // button avoids that race and covers every inspector control uniformly.
    const interval = window.setInterval(syncIfDirty, 180);
    const observer = new MutationObserver(syncIfDirty);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["disabled", "class"],
    });

    return () => {
      stopped = true;
      window.clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return null;
}
