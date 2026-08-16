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

function visibleEditableBlocks(doc: Document): HTMLElement[] {
  const candidates = Array.from(doc.querySelectorAll<HTMLElement>(
    "body > section, body > main > section, body > main > div, .site-main > section, .site-main > div, main.site-main > section, main.site-main > div",
  ));

  const unique = candidates.filter((element, index, all) => all.indexOf(element) === index);
  const visible = unique.filter((element) => {
    const style = doc.defaultView?.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (!style || style.display === "none" || style.visibility === "hidden") return false;
    if (rect.height < 40 || rect.width < 120) return false;
    if (element.matches("header, footer, nav")) return false;
    if (element.closest("header, footer, nav")) return false;
    return true;
  });

  // Keep only the outermost visual blocks. Nested wrappers otherwise create duplicate selections.
  return visible.filter((element) => !visible.some((other) => other !== element && other.contains(element)));
}

function selectEditorSection(index: number) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".wb-section-list > button"));
  const button = buttons[index];
  if (!button) return;
  button.click();
  button.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
            const frame = frameRef.current;
            const doc = frame?.contentDocument;
            if (!doc) return;
            doc.documentElement.classList.add("rascals-studio-mirror");
            const style = doc.createElement("style");
            style.textContent = `
              html.rascals-studio-mirror { scroll-behavior:auto !important; }
              html.rascals-studio-mirror body { overflow-x:hidden !important; }
              html.rascals-studio-mirror .public-admin-login,
              html.rascals-studio-mirror [data-admin-login],
              html.rascals-studio-mirror .skip-link { display:none !important; }
              html.rascals-studio-mirror a,
              html.rascals-studio-mirror button { cursor:pointer !important; }
              html.rascals-studio-mirror .studio-editable-block {
                position:relative !important;
                cursor:pointer !important;
                outline:2px solid transparent !important;
                outline-offset:-2px !important;
                transition:outline-color .14s ease, box-shadow .14s ease !important;
              }
              html.rascals-studio-mirror .studio-editable-block:hover {
                outline-color:#4e9dff !important;
                box-shadow:inset 0 0 0 1px rgba(78,157,255,.32) !important;
              }
              html.rascals-studio-mirror .studio-editable-block:hover::after {
                content:"KLICKEN ZUM BEARBEITEN";
                position:absolute;
                z-index:2147483646;
                top:12px;
                right:12px;
                padding:7px 10px;
                border-radius:7px;
                background:#1474e8;
                color:#fff;
                font:900 10px/1 Arial,sans-serif;
                letter-spacing:.08em;
                pointer-events:none;
              }
            `;
            doc.head.appendChild(style);

            const blocks = visibleEditableBlocks(doc);
            blocks.forEach((block) => block.classList.add("studio-editable-block"));

            const clickHandler = (event: MouseEvent) => {
              const target = event.target as HTMLElement | null;
              if (!target) return;
              const block = target.closest<HTMLElement>(".studio-editable-block");
              if (!block) return;
              const currentBlocks = visibleEditableBlocks(doc);
              const index = currentBlocks.indexOf(block);
              if (index < 0) return;
              event.preventDefault();
              event.stopPropagation();
              selectEditorSection(index);
            };

            doc.addEventListener("click", clickHandler, true);
          }}
        />
      </div>
      <div className="wb-live-mirror-badge">LIVE · 1:1 · KLICKEN ZUM BEARBEITEN</div>
    </div>,
    mount,
  );
}
