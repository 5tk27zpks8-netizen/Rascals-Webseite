"use client";

import { DragEvent, useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./media.css";

type MediaItem = {
  key: string;
  url: string;
  size: number;
  uploaded: string;
  contentType: string;
  originalName: string;
  uploadedBy: string;
};

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaManager() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<MediaItem | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/admin/api/media");
      if (!r.ok) throw new Error("Medien konnten nicht geladen werden.");
      const body = await r.json() as { items: MediaItem[] };
      setItems(body.items);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally { setLoading(false); }
  }

  async function upload(files: FileList | File[], replaceKey?: string) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true); setNotice("");
    try {
      for (const file of list) {
        const data = new FormData();
        data.append("file", file);
        if (replaceKey) data.append("replaceKey", replaceKey);
        const r = await fetch("/admin/api/media", { method: "POST", body: data });
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? `Upload fehlgeschlagen: ${file.name}`);
        }
      }
      await load();
      setNotice(replaceKey ? "Bild wurde unter derselben URL ersetzt." : `${list.length} Datei(en) hochgeladen.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    } finally { setUploading(false); }
  }

  async function remove(item: MediaItem) {
    if (!confirm(`„${item.originalName}“ wirklich löschen?`)) return;
    const r = await fetch(`/admin/api/media?key=${encodeURIComponent(item.key)}`, { method: "DELETE" });
    if (!r.ok) { setNotice("Löschen fehlgeschlagen."); return; }
    setItems((current) => current.filter((x) => x.key !== item.key));
    setSelected(null);
    setNotice("Bild gelöscht.");
  }

  const filtered = useMemo(() => items.filter((item) => `${item.originalName} ${item.key} ${item.uploadedBy}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  return <AdminShell active="media" title="Medienbibliothek" actions={<label className="cms-button media-upload-button">{uploading ? "Upload läuft…" : "＋ Bilder hochladen"}<input type="file" accept="image/*" multiple onChange={(e) => e.target.files && void upload(e.target.files)} /></label>}>
    {notice && <AdminNotice tone={notice.includes("fehl") ? "error" : "success"}>{notice}</AdminNotice>}
    <div className="media-layout">
      <div>
        <AdminCard>
          <div className="cms-section-head"><div><small>R2 STORAGE</small><h2>{items.length} Dateien</h2></div><input className="media-search" placeholder="Medien durchsuchen…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className={`media-dropzone ${dragging ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files); }}>
            <b>Bilder hier ablegen</b><span>JPG, PNG, WEBP, GIF oder SVG · maximal 15 MB</span>
          </div>
          {loading ? <p className="cms-muted">Medien werden geladen…</p> : <div className="media-grid">{filtered.map((item) => <button key={item.key} className={selected?.key === item.key ? "active" : ""} onClick={() => setSelected(item)}><img src={item.url} alt="" /><span><b>{item.originalName}</b><small>{sizeLabel(item.size)}</small></span></button>)}</div>}
          {!loading && !filtered.length && <p className="cms-muted">Keine Medien gefunden.</p>}
        </AdminCard>
      </div>
      <div>
        <AdminCard className="media-detail-card">
          <small>DATEIINFO</small>
          {selected ? <>
            <img className="media-detail-preview" src={selected.url} alt="" />
            <h2>{selected.originalName}</h2>
            <dl><div><dt>Typ</dt><dd>{selected.contentType}</dd></div><div><dt>Größe</dt><dd>{sizeLabel(selected.size)}</dd></div><div><dt>Upload</dt><dd>{new Date(selected.uploaded).toLocaleString("de-DE")}</dd></div><div><dt>Von</dt><dd>{selected.uploadedBy || "—"}</dd></div></dl>
            <div className="media-detail-actions"><button className="cms-button secondary" onClick={() => void navigator.clipboard.writeText(selected.url)}>URL kopieren</button><label className="cms-button secondary">Bild ersetzen<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload([e.target.files[0]], selected.key)} /></label><button className="cms-button secondary danger" onClick={() => void remove(selected)}>Löschen</button></div>
          </> : <p className="cms-muted">Wähle ein Bild aus, um Details zu sehen.</p>}
        </AdminCard>
      </div>
    </div>
  </AdminShell>;
}
