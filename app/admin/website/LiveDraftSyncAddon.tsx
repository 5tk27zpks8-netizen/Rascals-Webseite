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

function isDirty() {
  const state = document.querySelector<HTMLElement>(".wb-save-state");
  return state?.textContent?.toLowerCase().includes("ungespeichert") ?? false;
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
    const waitUntilDirtyAndSave = (attempt = 0) => {
      if (busy.current) {
        pending.current = true;
        return;
      }

      const button = findDraftSaveButton();
      const dirty = isDirty();

      // React updates the local builder state after the DOM event. In the old
      // implementation we often checked the button too early, saw it disabled,
      // and reloaded the old draft. Give React a short deterministic window to
      // expose the dirty state before deciding there is nothing to save.
      if ((!button || button.disabled || !dirty) && attempt < 12) {
        window.setTimeout(() => waitUntilDirtyAndSave(attempt + 1), 60);
        return;
      }

      if (!button || button.disabled || !dirty) {
        reloadMirror();
        return;
      }

      busy.current = true;
      button.click();

      const started = Date.now();
      const waitForSave = () => {
        const current = findDraftSaveButton();
        const elapsed = Date.now() - started;
        const finished = !isDirty() && Boolean(current && !current.disabled);

        if (finished || elapsed > 4000) {
          busy.current = false;
          reloadMirror();
          if (pending.current) {
            pending.current = false;
            window.setTimeout(() => waitUntilDirtyAndSave(), 80);
          }
          return;
        }
        window.setTimeout(waitForSave, 70);
      };
      window.setTimeout(waitForSave, 120);
    };

    const schedule = (event: Event) => {
      if (!isEditorControl(event.target)) return;
      if (timer.current) window.clearTimeout(timer.current);
      const element = event.target instanceof HTMLInputElement ? event.target : null;
      const isColor = element?.type === "color";
      timer.current = window.setTimeout(() => waitUntilDirtyAndSave(), isColor ? 80 : event.type === "input" ? 240 : 100);
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
