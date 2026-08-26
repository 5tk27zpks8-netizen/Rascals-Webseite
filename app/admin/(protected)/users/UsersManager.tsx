"use client";

import { useEffect, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../../_components/AdminShell";
import "./users.css";

type Role = "admin" | "editor" | "photographer" | "coach" | "gameday" | "viewer";
type CmsUser = { email: string; display_name: string; role: Role; active: number };

const empty: CmsUser = { email: "", display_name: "", role: "viewer", active: 1 };

export function UsersManager() {
  const [items, setItems] = useState<CmsUser[]>([]);
  const [selected, setSelected] = useState<CmsUser>(empty);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/admin/api/users");
      if (!r.ok) throw new Error(r.status === 403 ? "Nur Administratoren dürfen Benutzer verwalten." : "Benutzer konnten nicht geladen werden.");
      const body = await r.json() as { items: CmsUser[] };
      setItems(body.items);
      setSelected(body.items[0] ?? empty);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unbekannter Fehler"); }
    finally { setLoading(false); }
  }

  async function save() {
    const r = await fetch("/admin/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: selected.email, displayName: selected.display_name, role: selected.role, active: selected.active === 1 }) });
    if (!r.ok) { const body = await r.json().catch(() => ({})); setNotice(body.error ?? "Speichern fehlgeschlagen."); return; }
    setNotice("Benutzer und Berechtigungen gespeichert.");
    await load();
  }

  async function remove() {
    if (!selected.email || !confirm(`${selected.email} wirklich entfernen?`)) return;
    const r = await fetch(`/admin/api/users?email=${encodeURIComponent(selected.email)}`, { method: "DELETE" });
    if (!r.ok) { const body = await r.json().catch(() => ({})); setNotice(body.error ?? "Löschen fehlgeschlagen."); return; }
    setNotice("Benutzer entfernt.");
    await load();
  }

  return <AdminShell active="users" title="Benutzer & Rollen">
    {notice && <AdminNotice tone={notice.includes("gespeichert") || notice.includes("entfernt") ? "success" : "error"}>{notice}</AdminNotice>}
    <div className="users-grid">
      <AdminCard>
        <div className="cms-section-head"><div><small>ZUGRIFF</small><h2>CMS Benutzer</h2></div><button className="cms-button secondary" onClick={() => setSelected(empty)}>＋ Benutzer</button></div>
        {loading ? <p className="cms-muted">Wird geladen…</p> : <div className="users-list">{items.map((item) => <button key={item.email} className={selected.email === item.email ? "active" : ""} onClick={() => setSelected(item)}><b>{item.display_name || item.email}</b><span>{item.email}</span><small>{item.role.toUpperCase()} · {item.active === 1 ? "AKTIV" : "INAKTIV"}</small></button>)}</div>}
      </AdminCard>
      <AdminCard>
        <small>BENUTZERDETAILS</small><h2>{selected.email ? "Benutzer bearbeiten" : "Benutzer hinzufügen"}</h2>
        <div className="users-form">
          <label className="cms-field"><span>E-Mail</span><input value={selected.email} onChange={(e) => setSelected({ ...selected, email: e.target.value })} disabled={Boolean(selected.email && items.some((x) => x.email === selected.email))} /></label>
          <label className="cms-field"><span>Name</span><input value={selected.display_name} onChange={(e) => setSelected({ ...selected, display_name: e.target.value })} /></label>
          <label className="cms-field"><span>Rolle</span><select value={selected.role} onChange={(e) => setSelected({ ...selected, role: e.target.value as Role })}><option value="admin">Administrator</option><option value="editor">Redakteur</option><option value="photographer">Fotograf</option><option value="coach">Coach</option><option value="gameday">Gameday / Liveticker</option><option value="viewer">Standard (Spieler)</option></select></label>
          <label className="users-active"><input type="checkbox" checked={selected.active === 1} onChange={(e) => setSelected({ ...selected, active: e.target.checked ? 1 : 0 })} /> Zugang aktiv</label>
          <div className="users-actions"><button className="cms-button" onClick={() => void save()}>Speichern</button>{selected.email && <button className="cms-button secondary danger" onClick={() => void remove()}>Entfernen</button>}</div>
        </div>
        <div className="roles-help"><h3>Rechte</h3><p><b>Administrator:</b> Vollzugriff inklusive Benutzerverwaltung.</p><p><b>Redakteur:</b> Website gestalten, Designs, News, Medien und Sponsoren.</p><p><b>Fotograf:</b> Medienbibliothek.</p><p><b>Coach:</b> Spieler, Stats, Spiele und Gameday.</p><p><b>Gameday:</b> Spielplan und Liveticker – ideal für einen Spieler, der an diesem Spieltag nicht spielt.</p><p><b>Standard (Spieler):</b> Wird bei der Registrierung automatisch vergeben. Sieht Spielplan und Live-Ticker, kann nichts ändern.</p></div>
      </AdminCard>
    </div>
  </AdminShell>;
}
