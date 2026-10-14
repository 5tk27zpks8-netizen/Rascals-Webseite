"use client";

import { MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./live-website-mirror.css";

type PreviewMode = "desktop" | "tablet" | "mobile";
type TargetKind = "section" | "text" | "image" | "header";
type TargetRect = { left: number; top: number; width: number; height: number; kind: TargetKind; label: string };

const widths: Record<PreviewMode, number> = { desktop: 1800, tablet: 768, mobile: 390 };
const initialHeights: Record<PreviewMode, number> = { desktop: 1250, tablet: 1100, mobile: 980 };

function currentPreviewMode(): PreviewMode {
  const active = Array.from(document.querySelectorAll<HTMLButtonElement>(".wb-device-switch button")).find((button) => button.classList.contains("active"));
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
  buttons.find((button) => button.textContent?.toLowerCase().includes("website design"))?.click();
}

function isVisible(element: HTMLElement, doc: Document) {
  const style = doc.defaultView?.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return Boolean(style && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0 && rect.width >= 8 && rect.height >= 8);
}

function editableBlocks(doc: Document): HTMLElement[] {
  const main = doc.querySelector<HTMLElement>("main, .site-main, [role='main']");
  const root = main || doc.body;
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(":scope > section,:scope > article,:scope > div,section,[data-section],.hero,.stats-strip,.fixtures-section,.teamwear-section,.news-preview,.sponsor-strip,.join-section,.cta-section"))
    .filter((el) => isVisible(el, doc) && el.getBoundingClientRect().width >= 120 && el.getBoundingClientRect().height >= 45)
    .filter((el) => !el.closest("header, nav, footer"));

  const unique = candidates.filter((el, index, all) => all.indexOf(el) === index);
  const sectionCount = sectionButtons().length;
  let outer = unique.filter((el) => !unique.some((other) => other !== el && other.contains(el) && other.getBoundingClientRect().height <= el.getBoundingClientRect().height * 1.8));
  outer = outer.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

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
  return sectionCount > 0 && compact.length > sectionCount ? compact.slice(0, sectionCount) : compact;
}

function blockIndexAtPoint(doc: Document, x: number, y: number): number {
  const blocks = editableBlocks(doc);
  if (!blocks.length) return -1;
  for (const node of doc.elementsFromPoint(x, y)) {
    if (!(node instanceof HTMLElement)) continue;
    const index = blocks.findIndex((block) => block === node || block.contains(node));
    if (index >= 0) return index;
  }
  return blocks.findIndex((block) => {
    const rect = block.getBoundingClientRect();
    return y >= rect.top && y <= rect.bottom;
  });
}

function exactTargetAtPoint(doc: Document, x: number, y: number): HTMLElement | null {
  const stack = doc.elementsFromPoint(x, y).filter((node): node is HTMLElement => node instanceof HTMLElement);
  const header = stack.find((node) => node.closest("header, nav"));
  if (header) return header.closest<HTMLElement>("header, nav") || header;

  const text = stack.find((node) => {
    if (!/^(H1|H2|H3|H4|H5|H6|P|A|BUTTON|SPAN|STRONG|B|EM|I|SMALL|LI)$/.test(node.tagName)) return false;
    const value = (node.textContent || "").replace(/\s+/g, " ").trim();
    return value.length > 0 && value.length <= 300 && isVisible(node, doc);
  });
  if (text) return text;

  const image = stack.find((node) => node.matches("img, picture, video") || Boolean(node.closest("img, picture, video")));
  if (image) return image.closest<HTMLElement>("img, picture, video") || image;

  const index = blockIndexAtPoint(doc, x, y);
  return index >= 0 ? editableBlocks(doc)[index] || null : null;
}

function classifyTarget(element: HTMLElement): TargetKind {
  if (element.matches("header, nav") || element.closest("header, nav")) return "header";
  if (element.matches("img, picture, video")) return "image";
  if (/^(H1|H2|H3|H4|H5|H6|P|A|BUTTON|SPAN|STRONG|B|EM|I|SMALL|LI)$/.test(element.tagName)) return "text";
  return "section";
}

function targetLabel(kind: TargetKind) {
  if (kind === "text") return "TEXT BEARBEITEN";
  if (kind === "image") return "BILD BEARBEITEN";
  if (kind === "header") return "HEADER BEARBEITEN";
  return "ABSCHNITT BEARBEITEN";
}

function targetRect(element: HTMLElement): TargetRect {
  const rect = element.getBoundingClientRect();
  const kind = classifyTarget(element);
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, kind, label: targetLabel(kind) };
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function focusMatchingTextField(text: string) {
  const wanted = normalize(text);
  if (!wanted) return;
  window.setTimeout(() => {
    const fields = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(".wb-inspector input, .wb-inspector textarea, .wb-inspector-panel input, .wb-inspector-panel textarea"));
    const scored = fields.map((field) => {
      const value = normalize(field.value);
      let score = 0;
      if (value === wanted) score = 100;
      else if (value && wanted.includes(value) && value.length >= 3) score = 70 + Math.min(20, value.length);
      else if (value && value.includes(wanted) && wanted.length >= 3) score = 60 + Math.min(20, wanted.length);
      return { field, score };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.score <= 0) return;
    best.field.focus();
    best.field.scrollIntoView({ block: "center", behavior: "smooth" });
    best.field.select?.();
  }, 140);
}

function focusImageControls() {
  window.setTimeout(() => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(".wb-inspector label, .wb-inspector button, .wb-inspector h3, .wb-inspector h4, .wb-inspector-panel label, .wb-inspector-panel button"));
    const target = candidates.find((node) => /bild|image|hochladen/i.test(node.textContent || ""));
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 140);
}

function flattenInternalScrollContainers(doc: Document) {
  const win = doc.defaultView;
  if (!win) return;
  doc.documentElement.style.setProperty("height", "auto", "important");
  doc.documentElement.style.setProperty("min-height", "0", "important");
  doc.documentElement.style.setProperty("overflow", "visible", "important");
  doc.body.style.setProperty("height", "auto", "important");
  doc.body.style.setProperty("min-height", "0", "important");
  doc.body.style.setProperty("overflow", "visible", "important");

  for (const element of Array.from(doc.querySelectorAll<HTMLElement>("body *"))) {
    const style = win.getComputedStyle(element);
    const overflowY = style.overflowY;
    const isScroller = (overflowY === "auto" || overflowY === "scroll") && element.scrollHeight > element.clientHeight + 4;
    if (!isScroller) continue;
    element.style.setProperty("overflow-y", "visible", "important");
    element.style.setProperty("max-height", "none", "important");
    if (style.height !== "auto") element.style.setProperty("height", "auto", "important");
  }
}

function measureDocumentHeight(doc: Document) {
  const body = doc.body;
  const html = doc.documentElement;
  let bottom = 0;
  for (const element of Array.from(body?.children || [])) {
    if (!(element instanceof HTMLElement)) continue;
    bottom = Math.max(bottom, element.getBoundingClientRect().bottom + (doc.defaultView?.scrollY || 0));
  }
  return Math.max(bottom, body?.scrollHeight || 0, body?.offsetHeight || 0, html?.scrollHeight || 0, html?.offsetHeight || 0, html?.clientHeight || 0);
}

export function LiveWebsiteMirror() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [href, setHref] = useState("/");
  const [scale, setScale] = useState(1);
  const [frameHeight, setFrameHeight] = useState(initialHeights.desktop);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverRect, setHoverRect] = useState<TargetRect | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const cleanupFrameObservers = useRef<(() => void) | null>(null);
  const viewportWidth = widths[mode];

  useEffect(() => setFrameHeight(initialHeights[mode]), [mode, href]);

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
    const resize = () => setScale(Math.min(1, Math.max(1, mount.clientWidth) / viewportWidth));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    return () => {
      observer.disconnect();
      mount.classList.remove("wb-live-mirror-host");
    };
  }, [mount, viewportWidth]);

  useEffect(() => () => cleanupFrameObservers.current?.(), []);

  const src = useMemo(() => `${href}${href.includes("?") ? "&" : "?"}studio_mirror=1`, [href]);

  function pointFromEvent(event: ReactMouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
  }

  function handleMove(event: ReactMouseEvent<HTMLDivElement>) {
    const doc = frameRef.current?.contentDocument;
    if (!doc) {
      setHoverIndex(null);
      setHoverRect(null);
      return;
    }
    const { x, y } = pointFromEvent(event);
    setHoverIndex(blockIndexAtPoint(doc, x, y));
    const target = exactTargetAtPoint(doc, x, y);
    setHoverRect(target ? targetRect(target) : null);
  }

  function handleClick(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const { x, y } = pointFromEvent(event);
    const target = exactTargetAtPoint(doc, x, y);
    if (!target) return;

    const kind = classifyTarget(target);
    if (kind === "header") {
      selectThemeInspector();
      return;
    }

    const index = blockIndexAtPoint(doc, x, y);
    if (index >= 0) selectEditorSection(index);

    if (kind === "text") {
      focusMatchingTextField((target.textContent || "").replace(/\s+/g, " ").trim());
    } else if (kind === "image") {
      focusImageControls();
    }
  }

  function handleFrameLoad() {
    cleanupFrameObservers.current?.();
    cleanupFrameObservers.current = null;
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;

    doc.documentElement.classList.add("rascals-studio-mirror");
    const style = doc.createElement("style");
    style.textContent = `html.rascals-studio-mirror,html.rascals-studio-mirror body{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;scrollbar-width:none!important}html.rascals-studio-mirror::-webkit-scrollbar,html.rascals-studio-mirror body::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}html.rascals-studio-mirror .public-admin-login,html.rascals-studio-mirror [data-admin-login],html.rascals-studio-mirror .skip-link{display:none!important}`;
    doc.head.appendChild(style);

    let raf = 0;
    const syncHeight = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        flattenInternalScrollContainers(doc);
        const measured = measureDocumentHeight(doc);
        if (measured > 0) setFrameHeight(Math.ceil(measured + 4));
      });
    };
    syncHeight();
    window.setTimeout(syncHeight, 100);
    window.setTimeout(syncHeight, 350);
    window.setTimeout(syncHeight, 900);
    window.setTimeout(syncHeight, 1800);

    const resizeObserver = new ResizeObserver(syncHeight);
    if (doc.documentElement) resizeObserver.observe(doc.documentElement);
    if (doc.body) resizeObserver.observe(doc.body);
    const mutationObserver = new MutationObserver(syncHeight);
    mutationObserver.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, characterData: false });
    Array.from(doc.images).forEach((image) => { if (!image.complete) image.addEventListener("load", syncHeight, { once: true }); });

    cleanupFrameObservers.current = () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }

  if (!mount) return null;

  return createPortal(
    <div className={`wb-live-mirror ${mode}`} style={{ height: Math.ceil(frameHeight * scale) }}>
      <div className="wb-live-mirror-stage" style={{ width: viewportWidth, height: frameHeight, transform: `scale(${scale})` }}>
        <iframe key={src} ref={frameRef} src={src} title="1:1 Vorschau der veröffentlichten Website" className="wb-live-mirror-frame" scrolling="no" style={{ width: viewportWidth, height: frameHeight, overflow: "hidden" }} onLoad={handleFrameLoad}/>
        <div className={`wb-live-edit-layer ${hoverIndex !== null && hoverIndex >= 0 ? "has-target" : ""}`} onMouseMove={handleMove} onMouseLeave={() => { setHoverIndex(null); setHoverRect(null); }} onClick={handleClick} aria-label="Website direkt bearbeiten">
          {hoverRect && <div className={`wb-live-target wb-live-target-${hoverRect.kind}`} style={{ left: hoverRect.left, top: hoverRect.top, width: hoverRect.width, height: hoverRect.height }}><span>{hoverRect.label}</span></div>}
        </div>
      </div>
      <div className="wb-live-mirror-badge">LIVE · 1:1 · DIREKT BEARBEITBAR</div>
    </div>,
    mount,
  );
}
