"use client";

import { useRef, useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  maxMb?: number;
  helper?: string;
};

type UploadResponse = { item?: { url?: string }; url?: string; error?: string };

export function ImageUploadField({ label, value, onChange, accept = "image/*", maxMb = 15, helper }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setError("");
    if (file.size > maxMb * 1024 * 1024) {
      setError(`Datei ist größer als ${maxMb} MB.`);
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/admin/api/media", { method: "POST", body: data });
      const body = await response.json().catch(() => ({})) as UploadResponse;
      if (!response.ok) throw new Error(body.error || "Upload fehlgeschlagen.");
      const url = body.item?.url || body.url;
      if (!url) {
        const refresh = await fetch("/admin/api/media");
        const refreshed = await refresh.json() as { items?: Array<{ url: string; originalName?: string }> };
        const newest = refreshed.items?.find((x) => x.originalName === file.name) || refreshed.items?.[0];
        if (!newest?.url) throw new Error("Upload erfolgreich, Bild-URL konnte aber nicht ermittelt werden.");
        onChange(newest.url);
      } else {
        onChange(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return <div className="cms-field hero-full">
    <span>{label}</span>
    <div style={{display:"grid",gap:10}}>
      <input ref={inputRef} type="file" accept={accept} style={{display:"none"}} onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}/>
      <button type="button" className="cms-button secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? "Import läuft…" : "Bild importieren"}</button>
      {helper && <small className="cms-muted">{helper}</small>}
      {value && <div style={{display:"grid",gridTemplateColumns:"120px 1fr",gap:12,alignItems:"center"}}><img src={value} alt="" style={{width:120,height:80,objectFit:"contain",borderRadius:8,background:"#08121f"}}/><button type="button" className="cms-button secondary danger" onClick={() => onChange("")}>Bild entfernen</button></div>}
      {error && <small style={{color:"#ff7b6e"}}>{error}</small>}
    </div>
  </div>;
}
