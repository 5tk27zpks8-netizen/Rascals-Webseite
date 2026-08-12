"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminNotice, AdminShell } from "../_components/AdminShell";
import type { BuilderPage, SiteBuilderState } from "../../lib/site-builder";
import { applyDesignPreset, builtInDesignPresets, capturePageDesign, type DesignPreset } from "../../lib/design-presets";
import "./designs.css";

type SaveStatus = "idle" | "saving" | "done";

function uid() {
  return `design-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DesignManager() {
  const [state, setState] = useState<SiteBuilderState | null>(null);
  const [custom, setCustom] = useState<DesignPreset[]>([]);
  const [pageId, setPageId] = useState("");
  const [filter, setFilter] = useState<"all" | "built-in" | "custom">("all");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [beforeState, setBeforeState] = useState<SiteBuilderState | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [designName, setDesignName] = useState("");
  const [designDescription, setDesignDescription] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setNotice("");
    try {
      const [builderRes, designRes] = await Promise.all([
        fetch("/admin/api/site-builder"),
        fetch("/admin/api/design-presets"),
      ]);
      if (!builderRes.ok) throw new Error("Website konnte nicht geladen werden.");
      const builderBody = await builderRes.json() as { state: SiteBuilderState };
      const designBody = designRes.ok ? await designRes.json() as { items: DesignPreset[] } : { items: [] };
      setState(builderBody.state);
      setCustom(designBody.items || []);
      setPageId(builderBody.state.pages[0]?.id || "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Design-Bibliothek konnte nicht geladen werden.");
    }
  }

  const page = useMemo<BuilderPage | undefined>(() => state?.pages.find(item => item.id === pageId) || state?.pages[0], [state, pageId]);
  const presets = useMemo(() => {
    if (filter === "built-in") return builtInDesignPresets;
    if (filter === "custom") return custom;
    return [...builtInDesignPresets, ...custom];
  }, [custom, filter]);

  async function persistBuilder(next: SiteBuilderState) {
    const response = await fetch("/admin/api/site-builder", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(body.error || "Design konnte nicht angewendet werden.");
  }

  async function apply(preset: DesignPreset) {
    if (!state || !page || status === "saving") return;
    const previous = state;
    const next = applyDesignPreset(state, page.id, preset);
    setBeforeState(previous);
    setState(next);
    setStatus("saving");
    setNotice("");
    try {
      await persistBuilder(next);
      setNotice(`„${preset.name}“ wurde auf „${page.name}“ angewendet.`);
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch (error) {
      setState(previous);
      setBeforeState(null);
      setNotice(error instanceof Error ? error.message : "Design konnte nicht angewendet werden.");
      setStatus("idle");
    }
  }

  async function undo() {
    if (!beforeState || status === "saving") return;
    const restore = beforeState;
    const current = state;
    setState(restore);
    setStatus("saving");
    try {
      await persistBuilder(restore);
      setBeforeState(null);
      setNotice("Letzte Design-Änderung wurde rückgängig gemacht.");
    } catch (error) {
      if (current) setState(current);
      setNotice(error instanceof Error ? error.message : "Rückgängig konnte nicht gespeichert werden.");
    } finally {
      setStatus("idle");
    }
  }

  async function persistCustom(next: DesignPreset[]) {
    const response = await fetch("/admin/api/design-presets", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: next }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string; items?: DesignPreset[] };
    if (!response.ok) throw new Error(body.error || "Design konnte nicht gespeichert werden.");
    setCustom(body.items || next);
  }

  async function saveCurrentDesign() {
    if (!state || !page || !designName.trim()) return;
    const preset = capturePageDesign(state, page, uid(), designName.trim(), designDescription.trim() || `Gespeichert von ${page.name}`);
    const next = [preset, ...custom];
    setStatus("saving");
    setNotice("");
    try {
      await persistCustom(next);
      setShowSave(false);
      setDesignName("");
      setDesignDescription("");
      setFilter("custom");
      setNotice(`Eigenes Design „${preset.name}“ wurde gespeichert.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Design konnte nicht gespeichert werden.");
    } finally {
      setStatus("idle");
    }
  }

  async function removeCustom(id: string) {
    const item = custom.find(preset => preset.id === id);
    if (!item || !confirm(`Design „${item.name}“ löschen?`)) return;
    const next = custom.filter(preset => preset.id !== id);
    setStatus("saving");
    try {
      await persistCustom(next);
      setNotice(`„${item.name}“ wurde gelöscht.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Design konnte nicht gelöscht werden.");
    } finally {
      setStatus("idle");
    }
  }

  if (!state || !page) {
    return <AdminShell active="designs" title="Designs"><div className="design-loading">Design-Bibliothek wird geladen…</div></AdminShell>;
  }

  return <AdminShell
    active="designs"
    title="Designs"
    eyebrow="RASCALS DESIGN LIBRARY"
    actions={<a className="cms-button secondary" href="/admin/website">Website gestalten</a>}
  >
    <div className="design-studio">
      <header className="design-hero">
        <div>
          <small>DESIGN-BIBLIOTHEK</small>
          <h2>Design auswählen.<br/><span>Inhalte bleiben erhalten.</span></h2>
          <p>Wähle einen Look für eine Seite oder speichere dein aktuelles Styling als eigenes Design. Texte, Bilder und dynamische Inhalte werden beim Wechsel nicht überschrieben.</p>
        </div>
        <div className="design-page-picker">
          <label><span>Seite</span><select value={page.id} onChange={event => setPageId(event.target.value)}>{state.pages.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <button className="design-save-own" onClick={() => { setDesignName(`${page.name} Design`); setDesignDescription(""); setShowSave(true); }}>＋ Eigenes Design speichern</button>
        </div>
      </header>

      {notice && <div className="design-notice-row"><AdminNotice tone={notice.includes("konnte nicht") ? "error" : "success"}>{notice}</AdminNotice>{beforeState && <button onClick={() => void undo()} disabled={status === "saving"}>Rückgängig</button>}</div>}

      <div className="design-filter" role="tablist" aria-label="Designs filtern">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Alle</button>
        <button className={filter === "built-in" ? "active" : ""} onClick={() => setFilter("built-in")}>Vorlagen</button>
        <button className={filter === "custom" ? "active" : ""} onClick={() => setFilter("custom")}>Meine Designs <span>{custom.length}</span></button>
      </div>

      <div className="design-grid">
        {presets.map(preset => <article className="design-card" key={preset.id}>
          <div className="design-preview" style={{ background: preset.palette[0] || "#050d18" }}>
            <div className="design-preview-header" style={{ background: preset.palette[1] || preset.palette[0] }}><i/><i/><i/></div>
            <div className="design-preview-hero"><span style={{ background: preset.palette[2] || "#e7192d" }}/><b/><b/><em style={{ background: preset.palette[2] || "#e7192d" }}/></div>
            <div className="design-preview-blocks"><i style={{ background: preset.palette[1] || "#111" }}/><i style={{ background: preset.palette[3] || "#fff" }}/><i style={{ background: preset.palette[1] || "#111" }}/></div>
            <div className="design-swatches">{preset.palette.slice(0, 4).map((color, index) => <span key={`${color}-${index}`} style={{ background: color }}/>)}</div>
          </div>
          <div className="design-card-copy">
            <div className="design-card-title"><div><small>{preset.builtin ? "VORLAGE" : "EIGENES DESIGN"}</small><h3>{preset.name}</h3></div>{!preset.builtin && <button className="design-delete" onClick={() => void removeCustom(preset.id)} aria-label={`${preset.name} löschen`}>×</button>}</div>
            <p>{preset.description}</p>
            <button className="design-apply" disabled={status === "saving"} onClick={() => void apply(preset)}>{status === "saving" ? "Bitte warten…" : `Auf ${page.name} anwenden`} <span>→</span></button>
          </div>
        </article>)}
      </div>

      {filter === "custom" && custom.length === 0 && <div className="design-empty"><span>＋</span><h3>Noch keine eigenen Designs</h3><p>Gestalte eine Seite im Website Studio und speichere den aktuellen Look hier als wiederverwendbare Vorlage.</p><button onClick={() => { setDesignName(`${page.name} Design`); setShowSave(true); }}>Aktuelles Design speichern</button></div>}
    </div>

    {showSave && <div className="design-modal-backdrop" onMouseDown={() => setShowSave(false)}><div className="design-modal" onMouseDown={event => event.stopPropagation()}>
      <div className="design-modal-head"><div><small>EIGENES DESIGN</small><h2>Look speichern</h2></div><button onClick={() => setShowSave(false)}>×</button></div>
      <p>Gespeichert werden Farben, Abstände und das Styling der Abschnitte von „{page.name}“. Inhalte werden nicht als Vorlage kopiert.</p>
      <label><span>Name</span><input autoFocus value={designName} onChange={event => setDesignName(event.target.value)} placeholder="z. B. Rascals Playoffs"/></label>
      <label><span>Beschreibung</span><textarea rows={3} value={designDescription} onChange={event => setDesignDescription(event.target.value)} placeholder="Optional"/></label>
      <div className="design-modal-actions"><button onClick={() => setShowSave(false)}>Abbrechen</button><button className="primary" disabled={!designName.trim() || status === "saving"} onClick={() => void saveCurrentDesign()}>Design speichern</button></div>
    </div></div>}
  </AdminShell>;
}
