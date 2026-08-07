"use client";

import { useEffect, useMemo, useState } from "react";
import "../admin.css";
import "../phase2.css";
import "./sponsors.css";

type Sponsor = {
  id: string;
  name: string;
  logo: string;
  url: string;
  tier: "premium" | "gold" | "silver" | "partner";
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type MediaItem = { key: string; url: string };

const emptySponsor: Sponsor = {
  id: "",
  name: "",
  logo: "",
  url: "",
  tier: "partner",
  sortOrder: 0,
  active: true,
  createdAt: "",
  updatedAt: "",
};

export function SponsorsManager() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<Sponsor>(emptySponsor);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [sponsorsResponse, mediaResponse] = await Promise.all([
        fetch("/admin/api/sponsors"),
        fetch("/admin/api/media"),
      ]);
      if (!sponsorsResponse.ok || !mediaResponse.ok) throw new Error("Sponsoren konnten nicht geladen werden.");
      const sponsors = await sponsorsResponse.json() as { items: Sponsor[] };
      const files = await mediaResponse.json() as { items: MediaItem[] };
      setItems(sponsors.items);
      setMedia(files.items);
      setSelected(sponsors.items[0] ?? emptySponsor);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!selected.name.trim()) { setNotice("Bitte einen Sponsor-Namen eingeben."); return; }
    setSaving(true);
    try {
      const response = await fetch("/admin/api/sponsors", {
        method: selected.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (!response.ok) throw new Error("Speichern fehlgeschlagen.");
      const body = await response.json() as { item: Sponsor };
      setItems((current) => selected.id
        ? current.map((item) => item.id === body.item.id ? body.item : item)
        : [...current, body.item].sort((a,b) => a.sortOrder-b.sortOrder));
      setSelected(body.item);
      setNotice("Sponsor gespeichert.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!selected.id || !confirm(`„${selected.name}“ wirklich löschen?`)) return;
    const response = await fetch(`/admin/api/sponsors?id=${encodeURIComponent(selected.id)}`, { method: "DELETE" });
    if (!response.ok) { setNotice("Löschen fehlgeschlagen."); return; }
    setItems((current) => current.filter((item) => item.id !== selected.id));
    setSelected(emptySponsor);
    setNotice("Sponsor gelöscht.");
  }

  const filtered = useMemo(() => items.filter((item) =>
    `${item.name} ${item.tier}`.toLowerCase().includes(query.toLowerCase()),
  ), [items, query]);

  if (loading) return <div className="admin-loading"><img src="/rascals-logo-transparent-4k.png" alt="" /><b>SPONSOREN WERDEN GELADEN</b></div>;

  return <div className="sponsor-shell">
    <aside className="sponsor-sidebar">
      <a className="sponsor-brand" href="/admin/dashboard"><img src="/rascals-logo-transparent-4k.png" alt=""/><span><b>RASCALS CMS</b><small>SPONSOR CONTROL</small></span></a>
      <button className="new-sponsor" onClick={() => setSelected(emptySponsor)}>＋ Sponsor hinzufügen</button>
      <input placeholder="Sponsoren durchsuchen…" value={query} onChange={(event)=>setQuery(event.target.value)} />
      <div className="sponsor-list">{filtered.map((item)=><button key={item.id} className={selected.id===item.id?"active":""} onClick={()=>setSelected(item)}><b>{item.name}</b><small>{item.tier.toUpperCase()} · {item.active?"AKTIV":"INAKTIV"}</small></button>)}</div>
    </aside>
    <main className="sponsor-main">
      <header><div><small>PHASE 3 · SPONSOREN</small><h1>{selected.id?"Sponsor bearbeiten":"Sponsor hinzufügen"}</h1></div><div>{selected.id&&<button className="ghost-button" onClick={()=>void remove()}>Löschen</button>}<button className="publish-button" disabled={saving} onClick={()=>void save()}>{saving?"Speichert…":"Speichern"}</button></div></header>
      {notice&&<div className="admin-notice"><span>{notice}</span><button onClick={()=>setNotice("")}>×</button></div>}
      <section className="sponsor-grid">
        <article className="sponsor-form">
          <label>Name<input value={selected.name} onChange={(event)=>setSelected({...selected,name:event.target.value})} placeholder="Sponsorname"/></label>
          <label>Website<input value={selected.url} onChange={(event)=>setSelected({...selected,url:event.target.value})} placeholder="https://..."/></label>
          <div className="sponsor-cols">
            <label>Kategorie<select value={selected.tier} onChange={(event)=>setSelected({...selected,tier:event.target.value as Sponsor["tier"]})}><option value="premium">Premium</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="partner">Partner</option></select></label>
            <label>Reihenfolge<input type="number" value={selected.sortOrder} onChange={(event)=>setSelected({...selected,sortOrder:Number(event.target.value)})}/></label>
          </div>
          <label className="toggle-row"><input type="checkbox" checked={selected.active} onChange={(event)=>setSelected({...selected,active:event.target.checked})}/>Sponsor auf Website anzeigen</label>
          <label>Logo aus Medienbibliothek<select value={selected.logo} onChange={(event)=>setSelected({...selected,logo:event.target.value})}><option value="">Kein Logo</option>{media.map((item)=><option key={item.key} value={item.url}>{item.key.split("/").pop()}</option>)}</select></label>
        </article>
        <aside className="sponsor-preview"><small>LIVE-VORSCHAU</small><div>{selected.logo?<img src={selected.logo} alt=""/>:<span>LOGO</span>}<b>{selected.name||"Sponsorname"}</b><em>{selected.tier.toUpperCase()}</em></div></aside>
      </section>
    </main>
  </div>;
}
