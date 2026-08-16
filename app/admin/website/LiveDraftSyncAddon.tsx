"use client";

import { useEffect, useRef } from "react";

function isEditorControl(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (!target.closest(".wb-inspector, .wb-inspector-panel, .wb-sidebar, .wb-section-list, .wb-canvas-toolbar")) return false;
  if (target.closest("button")?.textContent?.toLowerCase().includes("entwurf speichern")) return false;
  return Boolean(target.closest("input, textarea, select, button, [role='button']"));
}

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
  const timer = useRef<number | null>(null);
  const busy = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    const sync = async () => {
      if (busy.current) {
        pending.current = true;
        return;
      }

      const button = findDraftSaveButton();
      if (!button || button.disabled) {
        window.setTimeout(reloadMirror, 120);
        return;
      }

      busy.current = true;
      button.click();

      const started = Date.now();
      const waitForSave = () => {
        const current = findDraftSaveButton();
        const elapsed = Date.now() - started;
        if (elapsed > 2600 || (current && !current.disabled && elapsed > 220)) {
          busy.current = false;
          reloadMirror();
          if (pending.current) {
            pending.current = false;
            window.setTimeout(() => void sync(), 100);
          }
          return;
        }
        window.setTimeout(waitForSave, 80);
      };
      window.setTimeout(waitForSave, 120);
    };

    const schedule = (event: Event) => {
      if (!isEditorControl(event.target)) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void sync(), event.type === "input" ? 420 : 120);
    };

    document.addEventListener("input", schedule, true);
    document.addEventListener("change", schedule, true);
    document.addEventListener("click", schedule, true);

    return () => {
      document.removeEventListener("input", schedule, true);
      document.removeEventListener("change", schedule, true);
      document.removeEventListener("click", schedule, true);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return null;
}
