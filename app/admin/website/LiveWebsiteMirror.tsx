"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./live-website-mirror.css";

type PreviewMode = "desktop" | "tablet" | "mobile";

const widths: Record<PreviewMode, number> = {
  desktop: 1800,
  tablet: 768,
  mobile: 390,
};

function currentPreviewMode(): PreviewMode {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".wb-device-switch button"));
  const active = buttons.find((button) => button.classList.contains("active"));
  const text = active?.textContent?.trim().toLowerCase() || "desktop";
  if (text.includes("mobil")) return "mobile";
  if (text.includes("tablet")) return "tablet";
  return "desktop";
}

function currentLiveHref(): string {
  const anchor = document.querySelector<HTMLAnchorElement>(".wb-canvas-toolbar > a");
  if (!anchor) return "/";
  try {
    const url = new URL(anchor.href, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

export function LiveWebsiteMirror() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [href, setHref] = useState("/");
  const [scale, setScale] = useState(1);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const viewportWidth = widths[mode];
  const frameHeight = mode === "desktop" ? 1250 : mode === "tablet" ? 1100 : 980;

  useEffect(() => {
    let stopped = false;
    const sync = () => {
      if (stopped) return;
      const target = document.querySelector<HTMLElement>(".wb-canvas-shell");
      if (target && target !== mount) setMount(target);
      setMode(currentPreviewMode());
      setHref(currentLiveHref());
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "href"] });
    document.addEventListener("click", sync, true);
    return () => {
      stopped = true;
      observer.disconnect();
      document.removeEventListener("click", sync, true);
    };
  }, [mount]);

  useEffect(() => {
    if (!mount) return;
    mount.classList.add("wb-live-mirror-host");
    const resize = () => {
      const available = Math.max(1, mount.clientWidth - 48);
      setScale(Math.min(1, available / viewportWidth));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    return () => {
      observer.disconnect();
      mount.classList.remove("wb-live-mirror-host");
    };
  }, [mount, viewportWidth]);

  const src = useMemo(() => {
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}studio_mirror=1`;
  }, [href]);

  if (!mount) return null;

  return createPortal(
    <div className={`wb-live-mirror ${mode}`} style={{ height: Math.ceil(frameHeight * scale) }}>
      <div className="wb-live-mirror-stage" style={{ width: viewportWidth, height: frameHeight, transform: `scale(${scale})` }}>
        <iframe
          key={src}
          ref={frameRef}
          src={src}
          title="1:1 Vorschau der veröffentlichten Website"
          className="wb-live-mirror-frame"
          style={{ width: viewportWidth, height: frameHeight }}
          onLoad={() => {
            const doc = frameRef.current?.contentDocument;
            if (!doc) return;
            doc.documentElement.classList.add("rascals-studio-mirror");
            const style = doc.createElement("style");
            style.textContent = `
              html.rascals-studio-mirror { scroll-behavior:auto !important; }
              html.rascals-studio-mirror body { overflow-x:hidden !important; }
              html.rascals-studio-mirror .public-admin-login,
              html.rascals-studio-mirror [data-admin-login],
              html.rascals-studio-mirror .skip-link { display:none !important; }
              html.rascals-studio-mirror a, html.rascals-studio-mirror button { pointer-events:none !important; }
            `;
            doc.head.appendChild(style);
          }}
        />
      </div>
      <div className="wb-live-mirror-badge">LIVE · 1:1</div>
    </div>,
    mount,
  );
}
