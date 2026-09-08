"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SiteBuilderState } from "../../../lib/site-builder";
import "./typography-studio.css";

const fontStyles = [
  { label: "Modern", heading: "Inter, Arial, sans-serif", body: "Inter, Arial, sans-serif" },
  { label: "Athletic", heading: '"Arial Black", Arial, sans-serif', body: '"Trebuchet MS", Arial, sans-serif' },
  { label: "Condensed", heading: '"Arial Narrow", Arial, sans-serif', body: '"Arial Narrow", Arial, sans-serif' },
  { label: "Editorial", heading: "Georgia, serif", body: "Georgia, serif" },
  { label: "Classic", heading: '"Trebuchet MS", Arial, sans-serif', body: "Arial, sans-serif" },
] as const;

type ThemePatch = Partial<SiteBuilderState["theme"]>;

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

export function TypographyStudioAddon() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [theme, setTheme] = useState<SiteBuilderState["theme"] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const syncMount = () => setMount(document.querySelector<HTMLElement>(".wb-inspector"));
    syncMount();
    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });
    fetch("/admin/api/site-builder").then(r => r.ok ? r.json() : null).then(body => body?.state?.theme && setTheme(body.state.theme));
    return () => observer.disconnect();
  }, []);

  async function apply(patch: ThemePatch) {
    if (!theme || saving) return;
    const optimistic = { ...theme, ...patch };
    setTheme(optimistic);
    setSaving(true);
    try {
      // Always merge into the newest saved draft so typography changes never
      // overwrite content/design edits made elsewhere in the inspector.
      const latestResponse = await fetch("/admin/api/site-builder", { cache: "no-store" });
      if (!latestResponse.ok) return;
      const latestBody = await latestResponse.json() as { state: SiteBuilderState };
      const next: SiteBuilderState = { ...latestBody.state, theme: { ...latestBody.state.theme, ...patch } };
      const saveResponse = await fetch("/admin/api/site-builder", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (saveResponse.ok) {
        const saved = await saveResponse.json() as { state?: SiteBuilderState };
        if (saved.state?.theme) setTheme(saved.state.theme);
        reloadMirror();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!mount || !theme) return null;

  return createPortal(
    <section className="type-studio type-studio-inline">
      <button className="type-studio-toggle" onClick={() => setOpen(value => !value)}>
        <span><b>Aa · Text & Typografie</b><small>Schriften und Textwirkung anpassen</small></span><em>{open ? "−" : "+"}</em>
      </button>
      {open && <div className="type-studio-body">
        <div className="type-style-grid">{fontStyles.map(item => <button key={item.label} onClick={() => void apply({ headingFont: item.heading, bodyFont: item.body })}><b style={{fontFamily:item.heading}}>Aa</b><span>{item.label}</span></button>)}</div>
        <div className="type-controls type-controls-inline">
          <label><span>Headline Gewicht</span><select value={theme.headingWeight} onChange={e => void apply({headingWeight:Number(e.target.value)})}><option value={600}>Semi Bold</option><option value={700}>Fett</option><option value={800}>Extra Fett</option><option value={900}>Black</option><option value={950}>Rascals</option></select></label>
          <label><span>Buchstabenabstand</span><input type="range" min={-0.12} max={0.12} step={0.005} value={theme.headingTracking} onChange={e => void apply({headingTracking:Number(e.target.value)})}/><strong>{theme.headingTracking.toFixed(3)}em</strong></label>
          <label><span>Text Zeilenhöhe</span><input type="range" min={1} max={2.2} step={0.05} value={theme.bodyLineHeight} onChange={e => void apply({bodyLineHeight:Number(e.target.value)})}/><strong>{theme.bodyLineHeight.toFixed(2)}</strong></label>
          <div className="type-format"><button className={theme.headingTransform==="uppercase"?"active":""} onClick={() => void apply({headingTransform:theme.headingTransform==="uppercase"?"none":"uppercase"})}>AA</button></div>
        </div>
        <small className="type-studio-hint">Den konkreten Text bearbeitest du weiterhin direkt im ausgewählten Abschnitt. Die Headline-Größe bleibt im Tab „Design“ je Desktop/Tablet/Mobil einstellbar.</small>
      </div>}
    </section>,
    mount,
  );
}
