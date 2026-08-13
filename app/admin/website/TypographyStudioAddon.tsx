"use client";

import { useEffect, useState } from "react";
import type { SiteBuilderState } from "../../lib/site-builder";
import "./typography-studio.css";

type ExtendedTheme = SiteBuilderState["theme"] & {
  bodyFontSize?: number;
  bodyFontWeight?: number;
  bodyItalic?: boolean;
  bodyLetterSpacing?: number;
  headingItalic?: boolean;
};

const fontStyles = [
  { label: "Modern", heading: "Inter, Arial, sans-serif", body: "Inter, Arial, sans-serif" },
  { label: "Athletic", heading: "Impact, Arial, sans-serif", body: "Trebuchet MS, Arial, sans-serif" },
  { label: "Condensed", heading: "Arial Narrow, Arial, sans-serif", body: "Arial Narrow, Arial, sans-serif" },
  { label: "Editorial", heading: "Georgia, serif", body: "Georgia, serif" },
  { label: "Classic", heading: "Trebuchet MS, Arial, sans-serif", body: "Arial, sans-serif" },
];

export function TypographyStudioAddon() {
  const [state, setState] = useState<SiteBuilderState | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/admin/api/site-builder").then(r => r.ok ? r.json() : null).then(body => body?.state && setState(body.state));
  }, []);

  if (!state) return null;
  const theme = state.theme as ExtendedTheme;
  const patch = (change: Partial<ExtendedTheme>) => setState({ ...state, theme: { ...state.theme, ...change } as SiteBuilderState["theme"] });

  async function save() {
    setSaving(true);
    const response = await fetch("/admin/api/site-builder", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(state) });
    setSaving(false);
    if (response.ok) window.location.reload();
  }

  return <section className="type-studio">
    <button className="type-studio-toggle" onClick={() => setOpen(!open)}><span><b>Aa · Text & Typografie</b><small>Schriftgröße, Fett, Kursiv und Schriftstile</small></span><em>{open ? "−" : "+"}</em></button>
    {open && <div className="type-studio-body">
      <div className="type-style-grid">{fontStyles.map(item => <button key={item.label} onClick={() => patch({ headingFont: item.heading, bodyFont: item.body })}><b style={{fontFamily:item.heading}}>Aa</b><span>{item.label}</span></button>)}</div>
      <div className="type-controls">
        <label><span>Textgröße</span><input type="range" min={12} max={28} value={theme.bodyFontSize ?? 16} onChange={e => patch({bodyFontSize:Number(e.target.value)})}/><strong>{theme.bodyFontSize ?? 16}px</strong></label>
        <label><span>Textgewicht</span><select value={theme.bodyFontWeight ?? 400} onChange={e => patch({bodyFontWeight:Number(e.target.value)})}><option value={300}>Leicht</option><option value={400}>Normal</option><option value={500}>Medium</option><option value={600}>Semi Bold</option><option value={700}>Fett</option><option value={800}>Extra Fett</option></select></label>
        <label><span>Buchstabenabstand</span><input type="range" min={-0.04} max={0.12} step={0.005} value={theme.bodyLetterSpacing ?? 0} onChange={e => patch({bodyLetterSpacing:Number(e.target.value)})}/><strong>{(theme.bodyLetterSpacing ?? 0).toFixed(3)}em</strong></label>
        <div className="type-format"><button className={(theme.bodyFontWeight ?? 400)>=700?"active":""} onClick={() => patch({bodyFontWeight:(theme.bodyFontWeight ?? 400)>=700?400:700})}><b>B</b></button><button className={theme.bodyItalic?"active":""} onClick={() => patch({bodyItalic:!theme.bodyItalic})}><i>I</i></button><button className={theme.headingItalic?"active":""} onClick={() => patch({headingItalic:!theme.headingItalic})}><i>Headline</i></button></div>
      </div>
      <div className="type-studio-footer"><small>Headline-Größe bleibt je Abschnitt und Desktop/Tablet/Mobil separat einstellbar.</small><button onClick={() => void save()} disabled={saving}>{saving?"Speichert…":"Als Entwurf übernehmen"}</button></div>
    </div>}
  </section>;
}
