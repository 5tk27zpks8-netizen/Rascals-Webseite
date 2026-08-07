"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./hero.css";

type HeroButtonStyle = "red" | "ghost" | "light";
type HeroTransition = "fade" | "slide" | "zoom" | "parallax";

type HeroSlide = {
  id: string;
  image: string;
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
  buttonStyle?: HeroButtonStyle;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  secondaryButtonStyle?: HeroButtonStyle;
  active?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

type CmsState = {
  slides: HeroSlide[];
  intervalSeconds: number;
  transition: HeroTransition;
  shopUrl: string;
};

type MediaItem = { key: string; url: string };
type PreviewMode = "desktop" | "tablet" | "mobile";

const emptyState: CmsState = { slides: [], intervalSeconds: 7, transition: "fade", shopUrl: "" };

export function HeroManager() {
  const [state, setState] = useState<CmsState>(emptyState);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [cmsRes, mediaRes] = await Promise.all([fetch("/admin/api/cms"), fetch("/admin/api/media")]);
      if (!cmsRes.ok || !mediaRes.ok) throw new Error("Hero-Daten konnten nicht geladen werden.");
      const cms = await cmsRes.json() as { state: CmsState };
      const files = await mediaRes.json() as { items: MediaItem[] };
      const normalized = {
        ...cms.state,
        slides: cms.state.slides.map((slide) => ({
          active: true,
          startsAt: null,
          endsAt: null,
          buttonStyle: "red" as HeroButtonStyle,
          secondaryButtonLabel: "",
          secondaryButtonUrl: "",
          secondaryButtonStyle: "ghost" as HeroButtonStyle,
          ...slide,
        })),
      };
      setState(normalized);
      setMedia(files.items);
      setSelectedId(normalized.slides[0]?.id ?? "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  const selected = useMemo(() => state.slides.find((slide) => slide.id === selectedId) ?? state.slides[0], [state.slides, selectedId]);

  function patchSlide(id: string, patch: Partial<HeroSlide>) {
    setState((current) => ({ ...current, slides: current.slides.map((slide) => slide.id === id ? { ...slide, ...patch } : slide) }));
  }

  function addSlide() {
    const id = crypto.randomUUID();
    const slide: HeroSlide = {
      id,
      image: media[0]?.url ?? "/helmet-hero-4k.webp",
      eyebrow: "Rascals Highlight",
      title: "NEUER",
      accent: "SLIDE.",
      text: "Passe Inhalt, Bild und Veröffentlichungszeitraum an.",
      buttonLabel: "Mehr erfahren",
      buttonUrl: "/",
      buttonStyle: "red",
      secondaryButtonLabel: "",
      secondaryButtonUrl: "",
      secondaryButtonStyle: "ghost",
      active: true,
      startsAt: null,
      endsAt: null,
    };
    setState((current) => ({ ...current, slides: [...current.slides, slide] }));
    setSelectedId(id);
  }

  function duplicateSlide(slide: HeroSlide) {
    const clone = { ...slide, id: crypto.randomUUID(), title: `${slide.title} KOPIE` };
    setState((current) => ({ ...current, slides: [...current.slides, clone] }));
    setSelectedId(clone.id);
  }

  function removeSlide(id: string) {
    if (state.slides.length <= 1) {
      setNotice("Mindestens ein Hero-Slide muss bestehen bleiben.");
      return;
    }
    if (!confirm("Diesen Hero-Slide wirklich löschen?")) return;
    const next = state.slides.filter((slide) => slide.id !== id);
    setState((current) => ({ ...current, slides: next }));
    setSelectedId(next[0]?.id ?? "");
  }

  function dropSlide(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;
    setState((current) => {
      const slides = [...current.slides];
      const [moved] = slides.splice(dragIndex, 1);
      slides.splice(targetIndex, 0, moved);
      return { ...current, slides };
    });
    setDragIndex(null);
  }

  async function uploadHeroImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selected) return;
    setUploading(true);
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/admin/api/media", { method: "POST", body: data });
      const body = await response.json().catch(() => ({})) as { key?: string; url?: string; error?: string };
      if (!response.ok || !body.url || !body.key) throw new Error(body.error ?? "Bild-Upload fehlgeschlagen.");
      const item = { key: body.key, url: body.url };
      setMedia((current) => [item, ...current.filter((entry) => entry.key !== item.key)]);
      patchSlide(selected.id, { image: body.url });
      setNotice("Bild wurde hochgeladen und dem aktuellen Slide zugewiesen.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Bild-Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/admin/api/cms", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!response.ok) throw new Error("Speichern fehlgeschlagen.");
      setNotice("Hero wurde in D1 gespeichert. Die öffentliche Website verwendet jetzt diesen Stand.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell active="hero" title="Hero verwalten" actions={<button className="cms-button" disabled={saving || loading} onClick={() => void save()}>{saving ? "Speichert…" : "Änderungen speichern"}</button>}>
      {notice && <AdminNotice tone={notice.includes("gespeichert") || notice.includes("hochgeladen") ? "success" : "error"}>{notice}</AdminNotice>}
      {loading ? <AdminCard><b>Hero-Daten werden geladen…</b></AdminCard> : (
        <div className="hero-admin-grid">
          <AdminCard className="hero-list-card">
            <div className="cms-section-head"><div><small>REIHENFOLGE</small><h2>Hero Slides</h2></div><button className="cms-button secondary" onClick={addSlide}>＋ Neuer Slide</button></div>
            <p className="cms-muted">Per Drag & Drop sortieren. Die Reihenfolge wird exakt so auf der Website verwendet.</p>
            <div className="hero-sort-list">
              {state.slides.map((slide, index) => (
                <button key={slide.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropSlide(index, event)} onClick={() => setSelectedId(slide.id)} className={selected?.id === slide.id ? "active" : ""}>
                  <span className="drag-handle">☰</span><img src={slide.image} alt="" /><span className="hero-list-copy"><b>{slide.title} {slide.accent}</b><small>{slide.active === false ? "INAKTIV" : "AKTIV"} · Position {index + 1}</small></span>
                </button>
              ))}
            </div>
          </AdminCard>

          {selected && <div className="hero-editor-column">
            <AdminCard>
              <div className="cms-section-head"><div><small>INHALT</small><h2>{selected.title} {selected.accent}</h2></div><div className="hero-inline-actions"><button className="cms-button secondary" onClick={() => duplicateSlide(selected)}>Duplizieren</button><button className="cms-button secondary danger" onClick={() => removeSlide(selected.id)}>Löschen</button></div></div>
              <div className="cms-grid-2">
                <label className="cms-field"><span>Eyebrow</span><input value={selected.eyebrow} onChange={(e) => patchSlide(selected.id, { eyebrow: e.target.value })} /></label>
                <label className="cms-field"><span>Haupttitel</span><input value={selected.title} onChange={(e) => patchSlide(selected.id, { title: e.target.value })} /></label>
                <label className="cms-field"><span>Akzenttitel</span><input value={selected.accent} onChange={(e) => patchSlide(selected.id, { accent: e.target.value })} /></label>
                <label className="cms-field"><span>Bild aus Medien</span><select value={selected.image} onChange={(e) => patchSlide(selected.id, { image: e.target.value })}><option value={selected.image}>Aktuelles Bild</option>{media.map((item) => <option key={item.key} value={item.url}>{item.key.split("/").pop()}</option>)}</select></label>
                <label className="cms-field hero-full"><span>Neues Hero-Bild hochladen</span><span className="hero-upload-control"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" onChange={(event) => void uploadHeroImage(event)} disabled={uploading} /><b>{uploading ? "Upload läuft…" : "Datei auswählen · max. 15 MB"}</b></span></label>
                <label className="cms-field hero-full"><span>Beschreibung</span><textarea rows={4} value={selected.text} onChange={(e) => patchSlide(selected.id, { text: e.target.value })} /></label>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="cms-section-head"><div><small>CALL TO ACTION</small><h2>Buttons</h2></div></div>
              <div className="hero-button-config">
                <div className="hero-button-block">
                  <b>Primärer Button</b>
                  <div className="cms-grid-2">
                    <label className="cms-field"><span>Text</span><input value={selected.buttonLabel} onChange={(e) => patchSlide(selected.id, { buttonLabel: e.target.value })} /></label>
                    <label className="cms-field"><span>Link</span><input value={selected.buttonUrl} onChange={(e) => patchSlide(selected.id, { buttonUrl: e.target.value })} /></label>
                    <label className="cms-field"><span>Stil</span><select value={selected.buttonStyle ?? "red"} onChange={(e) => patchSlide(selected.id, { buttonStyle: e.target.value as HeroButtonStyle })}><option value="red">Rot</option><option value="ghost">Outline / Ghost</option><option value="light">Hell</option></select></label>
                  </div>
                </div>
                <div className="hero-button-block">
                  <b>Zweiter Button (optional)</b>
                  <div className="cms-grid-2">
                    <label className="cms-field"><span>Text</span><input value={selected.secondaryButtonLabel ?? ""} onChange={(e) => patchSlide(selected.id, { secondaryButtonLabel: e.target.value })} placeholder="Leer lassen = ausblenden" /></label>
                    <label className="cms-field"><span>Link</span><input value={selected.secondaryButtonUrl ?? ""} onChange={(e) => patchSlide(selected.id, { secondaryButtonUrl: e.target.value })} /></label>
                    <label className="cms-field"><span>Stil</span><select value={selected.secondaryButtonStyle ?? "ghost"} onChange={(e) => patchSlide(selected.id, { secondaryButtonStyle: e.target.value as HeroButtonStyle })}><option value="ghost">Outline / Ghost</option><option value="red">Rot</option><option value="light">Hell</option></select></label>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="cms-section-head"><div><small>VERÖFFENTLICHUNG</small><h2>Status & Zeitsteuerung</h2></div></div>
              <div className="hero-publish-grid">
                <label className="hero-switch"><input type="checkbox" checked={selected.active !== false} onChange={(e) => patchSlide(selected.id, { active: e.target.checked })} /><span /><b>{selected.active === false ? "Inaktiv" : "Aktiv"}</b></label>
                <label className="cms-field"><span>Start (optional)</span><input type="datetime-local" value={toLocalInput(selected.startsAt)} onChange={(e) => patchSlide(selected.id, { startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
                <label className="cms-field"><span>Ende (optional)</span><input type="datetime-local" value={toLocalInput(selected.endsAt)} onChange={(e) => patchSlide(selected.id, { endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="hero-preview-toolbar"><div><small>LIVE-VORSCHAU</small><h2>Responsive Preview</h2></div><div>{(["desktop","tablet","mobile"] as PreviewMode[]).map((mode) => <button key={mode} className={previewMode === mode ? "active" : ""} onClick={() => setPreviewMode(mode)}>{mode === "desktop" ? "Desktop" : mode === "tablet" ? "Tablet" : "Mobil"}</button>)}</div></div>
              <div className={`hero-live-frame ${previewMode} transition-${state.transition}`}>
                <img src={selected.image} alt="" /><div className="hero-live-shade" />
                <div className="hero-live-copy"><small>{selected.eyebrow}</small><h2>{selected.title}<br/><i>{selected.accent}</i></h2><p>{selected.text}</p><div className="hero-live-buttons"><span className={`preview-button ${selected.buttonStyle ?? "red"}`}>{selected.buttonLabel || "Button"} →</span>{selected.secondaryButtonLabel && <span className={`preview-button ${selected.secondaryButtonStyle ?? "ghost"}`}>{selected.secondaryButtonLabel} →</span>}</div></div>
              </div>
            </AdminCard>

            <AdminCard>
              <div className="cms-grid-2">
                <label className="cms-field"><span>Wechselintervall</span><select value={state.intervalSeconds} onChange={(e) => setState({ ...state, intervalSeconds: Number(e.target.value) })}><option value={4}>4 Sekunden</option><option value={7}>7 Sekunden</option><option value={10}>10 Sekunden</option><option value={15}>15 Sekunden</option></select></label>
                <label className="cms-field"><span>Übergang</span><select value={state.transition} onChange={(e) => setState({ ...state, transition: e.target.value as HeroTransition })}><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option><option value="parallax">Parallax</option></select></label>
              </div>
            </AdminCard>
          </div>}
        </div>
      )}
    </AdminShell>
  );
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
