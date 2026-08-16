"use client";

import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./live-website-mirror.css";

type PreviewMode = "desktop" | "tablet" | "mobile";

const widths: Record<PreviewMode, number> = { desktop: 1800, tablet: 768, mobile: 390 };

function currentPreviewMode(): PreviewMode {
  const active = Array.from(document.querySelectorAll<HTMLButtonElement>(".wb-device-switch button"))
    .find((button) => button.classList.contains("active"));
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

function sectionButtons() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>(".wb-section-list > button"));
}

function selectEditorSection(index: number) {
  const button = sectionButtons()[index];
  if (!button) return;
  button.click();
  button.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function selectThemeInspector() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".wb-nav-special"));
  const theme = buttons.find((button) => button.textContent?.toLowerCase().includes("website design"));
  theme?.click();
}

function isVisible(element: HTMLElement, doc: Document) {
  const style = doc.defaultView?.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return Boolean(style && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0 && rect.width >= 120 && rect.height >= 45);
}

/**
 * Discover the public page's large visual sections instead of depending on one
 * historical DOM structure. This is intentionally broad because the live site
 * can switch between the legacy Rascals layout and Builder layouts.
 */
function editableBlocks(doc: Document): HTMLElement[] {
  const main = doc.querySelector<HTMLElement>("main, .site-main, [role='main']");
  const root = main || doc.body;
  const selectors = [
    ":scope > section",
    ":scope > article",
    ":scope > div",
    "section",
    "[data-section]",
    ".hero",
    ".stats-strip",
    ".fixtures-section",
    ".teamwear-section",
    ".news-preview",
    ".sponsor-strip",
    ".join-section",
    ".cta-section",
  ];
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(selectors.join(",")))
    .filter((el) => isVisible(el, doc))
    .filter((el) => !el.closest("header, nav, footer"));

  const unique = candidates.filter((el, index, all) => all.indexOf(el) === index);
  const sectionCount = sectionButtons().length;

  // Prefer large outer visual regions and avoid nested cards/images becoming
  // separate editor targets.
  let outer = unique.filter((el) => !unique.some((other) => other !== el && other.contains(el) && other.getBoundingClientRect().height <= el.getBoundingClientRect().height * 1.8));
  outer = outer.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

  // If the generic discovery produced too many wrappers, select the strongest
  // non-overlapping regions by vertical position. This keeps the live page and
  // the Builder section list aligned.
  const compact: HTMLElement[] = [];
  for (const el of outer) {
    const rect = el.getBoundingClientRect();
    const duplicate = compact.some((existing) => {
      const r = existing.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top));
      return overlap > Math.min(r.height, rect.height) * 0.72;
    });
    if (!duplicate) compact.push(el);
  }

  if (sectionCount > 0 && compact.length > sectionCount) return compact.slice(0, sectionCount);
  return compact;
}

function blockIndexAtPoint(doc: Document, x: number, y: number): number {
  const blocks = editableBlocks(doc);
  if (!blocks.length) return -1;

  const stack = doc.elementsFromPoint(x, y);
  for (const node of stack) {
    if (!(node instanceof HTMLElement)) continue;
    const index = blocks.findIndex((block) => block === node || block.contains(node));
    if (index >= 0) return index;
  }

  // Fallback to vertical hit-testing. This also works when an absolutely
  // positioned image/overlay covers the section DOM node.
  const byRect = blocks.findIndex((block) => {
    const rect = block.getBoundingClientRect();
    return y >= rect.top && y <= rect.bottom;
  });
  return byRect;
}

export function LiveWebsiteMirror() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [href, setHref] = useState("/");
  const [scale, setScale] = useState(1);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
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

  const src = useMemo(() => `${href}${href.includes("?") ? "&" : "?"}studio_mirror=1`, [href]);

  function pointFromEvent(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  }

  function handleMove(event: ReactMouseEvent<HTMLDivElement>) {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return setHoverIndex(null);
    const { x, y } = pointFromEvent(event);
    setHoverIndex(blockIndexAtPoint(doc, x, y));
  }

  function handleClick(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const { x, y } = pointFromEvent(event);

    // Header/navigation is edited through the global Website Design inspector.
    const node = doc.elementFromPoint(x, y) as HTMLElement | null;
    if (node?.closest("header, nav")) {
      selectThemeInspector();
      return;
    }

    const index = blockIndexAtPoint(doc, x, y);
    if (index >= 0) selectEditorSection(index);
  }

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
            `;
            doc.head.appendChild(style);
          }}
        />
        <div
          className={`wb-live-edit-layer ${hoverIndex !== null && hoverIndex >= 0 ? "has-target" : ""}`}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
          onClick={handleClick}
          aria-label="Website-Abschnitt zum Bearbeiten auswählen"
        >
          {hoverIndex !== null && hoverIndex >= 0 && <span>ABSCHNITT {hoverIndex + 1} · KLICKEN ZUM BEARBEITEN</span>}
        </div>
      </div>
      <div className="wb-live-mirror-badge">LIVE · 1:1 · DIREKT BEARBEITBAR</div>
    </div>,
    mount,
  );
}
