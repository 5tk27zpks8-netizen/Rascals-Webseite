"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./games.css";

type Game = {
  id: string;
  slug: string;
  opponent: string;
  opponentLogo: string;
  venue: string;
  homeAway: "home" | "away";
  kickoff: string | null;
  status: "upcoming" | "live" | "final" | "postponed" | "cancelled";
  rascalsScore: number;
  opponentScore: number;
  quarter: string;
  gameClock: string;
  createdAt: string;
  updatedAt: string;
};

type MediaItem = {
  key: string;
  url: string;
  originalName?: string;
};

const emptyGame: Game = {
  id: "",
  slug: "",
  opponent: "",
  opponentLogo: "",
  venue: "",
  homeAway: "home",
  kickoff: null,
  status: "upcoming",
  rascalsScore: 0,
  opponentScore: 0,
  quarter: "",
  gameClock: "",
  createdAt: "",
  updatedAt: "",
};

export function GamesManager() {
  const [items, setItems] = useState<Game[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<Game>(emptyGame);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [gamesRes, mediaRes] = await Promise.all([fetch("/admin/api/games"), fetch("/admin/api/media")]);
      if (!gamesRes.ok) throw new Error("Spielplan konnte nicht geladen werden.");
      const games = await gamesRes.json() as { items: Game[] };
      const mediaBody = mediaRes.ok ? await mediaRes.json() as { items: MediaItem[] } : { items: [] };
      setItems(games.items);
      setMedia(mediaBody.items);
      setSelected(games.items[0] ?? emptyGame);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function refreshMedia() {
    const response = await fetch("/admin/api/media");
    if (!response.ok) return [] as MediaItem[];
    const body = await response.json() as { items: MediaItem[] };
    setMedia(body.items);
    return body.items;
  }

  async function uploadOpponentLogo(file: File) {
    setUploadingLogo(true);
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/admin/api/media", { method: "POST", body: data });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Logo-Upload fehlgeschlagen.");
      }

      const newMedia = await refreshMedia();
      const uploaded = newMedia.find((item) => item.originalName === file.name) ?? newMedia[0];
      if (!uploaded) throw new Error("Logo wurde hochgeladen, konnte aber nicht automatisch ausgewählt werden.");

      setSelected((current) => ({ ...current, opponentLogo: uploaded.url }));
      setNotice("Gegnerlogo hochgeladen und ausgewählt. Spiel bitte noch speichern.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Logo-Upload fehlgeschlagen.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save() {
    if (!selected.opponent.trim()) {
      setNotice("Bitte einen Gegner eintragen.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/admin/api/games", {
        method: selected.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(selected),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Speichern fehlgeschlagen.");
      }
      const body = await response.json() as { item: Game };
      setItems((current) => selected.id ? current.map((item) => item.id === body.item.id ? body.item : item) : [...current, body.item]);
      setSelected(body.item);
      setNotice("Spiel gespeichert.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected.id || !confirm(`Spiel gegen ${selected.opponent} wirklich löschen?`)) return;
    const response = await fetch(`/admin/api/games?id=${encodeURIComponent(selected.id)}`, { method: "DELETE" });
    if (!response.ok) {
      setNotice("Löschen fehlgeschlagen.");
      return;
    }
    setItems((current) => current.filter((item) => item.id !== selected.id));
    setSelected(emptyGame);
    setNotice("Spiel gelöscht.");
  }

  const filtered = useMemo(() => items.filter((item) => `${item.opponent} ${item.venue} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const isLive = selected.status === "live";

  return (
    <AdminShell active="games" title="Spielplan & Ergebnisse" actions={<button className="cms-button" disabled={saving || loading} onClick={() => void save()}>{saving ? "Speichert…" : "Spiel speichern"}</button>}>
      {notice && <AdminNotice tone={notice.includes("gespeichert") || notice.includes("gelöscht") || notice.includes("hochgeladen") ? "success" : "error"}>{notice}</AdminNotice>}
      <div className="games-layout">
        <AdminCard className="games-list">
          <div className="cms-section-head"><div><small>SAISON 2026</small><h2>{items.length} Spiele</h2></div><button className="cms-button secondary" onClick={() => setSelected(emptyGame)}>＋ Spiel</button></div>
          <input className="games-search" placeholder="Gegner oder Ort…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="games-items">
            {filtered.map((game) => (
              <button key={game.id} className={selected.id === game.id ? "active" : ""} onClick={() => setSelected(game)}>
                <span className={`game-status-dot ${game.status}`} />
                <span><b>{game.homeAway === "home" ? "vs" : "@"} {game.opponent}</b><small>{formatDate(game.kickoff)} · {statusLabel(game.status)}</small></span>
                {game.status === "final" || game.status === "live" ? <strong>{game.rascalsScore}:{game.opponentScore}</strong> : null}
              </button>
            ))}
          </div>
        </AdminCard>

        <div className="games-editor">
          <AdminCard>
            <div className="cms-section-head"><div><small>GAME CARD</small><h2>{selected.opponent || "Neues Spiel"}</h2></div>{selected.id && <button className="cms-button secondary danger" onClick={() => void remove()}>Löschen</button>}</div>
            <div className={`game-score-preview ${isLive ? "live" : ""}`}>
              <div><img src="/rascals-logo-transparent-4k.png" alt=""/><b>RASCALS</b><strong>{selected.rascalsScore}</strong></div>
              <span>{isLive ? "LIVE" : statusLabel(selected.status)}</span>
              <div>{selected.opponentLogo ? <img src={selected.opponentLogo} alt=""/> : <div className="game-logo-placeholder">?</div>}<b>{selected.opponent || "GEGNER"}</b><strong>{selected.opponentScore}</strong></div>
            </div>
          </AdminCard>

          <AdminCard>
            <div className="cms-grid-2">
              <label className="cms-field"><span>Gegner</span><input value={selected.opponent} onChange={(event) => setSelected({ ...selected, opponent: event.target.value })} /></label>

              <div className="cms-field opponent-logo-field">
                <span>Gegnerlogo</span>
                <div className="opponent-logo-controls">
                  <label className={`cms-button secondary opponent-logo-upload ${uploadingLogo ? "disabled" : ""}`}>
                    {uploadingLogo ? "Upload läuft…" : "＋ Logo hochladen"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={uploadingLogo}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadOpponentLogo(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <select value={selected.opponentLogo} onChange={(event) => setSelected({ ...selected, opponentLogo: event.target.value })}>
                    <option value="">Kein Logo</option>
                    {media.map((item) => <option key={item.key} value={item.url}>{item.originalName || item.key.split("/").pop()}</option>)}
                  </select>
                </div>
                <div className="opponent-logo-preview">
                  {selected.opponentLogo ? <img src={selected.opponentLogo} alt="Vorschau Gegnerlogo" /> : <div className="game-logo-placeholder">?</div>}
                  <small>{selected.opponentLogo ? "Aktuell ausgewähltes Gegnerlogo" : "Noch kein Gegnerlogo ausgewählt"}</small>
                </div>
              </div>

              <label className="cms-field"><span>Heim / Auswärts</span><select value={selected.homeAway} onChange={(event) => setSelected({ ...selected, homeAway: event.target.value as Game["homeAway"] })}><option value="home">Heimspiel</option><option value="away">Auswärtsspiel</option></select></label>
              <label className="cms-field"><span>Datum & Kickoff</span><input type="datetime-local" value={toLocalInput(selected.kickoff)} onChange={(event) => setSelected({ ...selected, kickoff: event.target.value || null })} /></label>
              <label className="cms-field hero-full"><span>Ort / Stadion</span><input value={selected.venue} onChange={(event) => setSelected({ ...selected, venue: event.target.value })} placeholder="z. B. Heidenheim" /></label>
              <label className="cms-field"><span>Status</span><select value={selected.status} onChange={(event) => setSelected({ ...selected, status: event.target.value as Game["status"] })}><option value="upcoming">Kommend</option><option value="live">Live</option><option value="final">Beendet</option><option value="postponed">Verschoben</option><option value="cancelled">Abgesagt</option></select></label>
              <label className="cms-field"><span>Quarter (optional)</span><select value={selected.quarter} onChange={(event) => setSelected({ ...selected, quarter: event.target.value })}><option value="">—</option><option>Q1</option><option>Q2</option><option>HALFTIME</option><option>Q3</option><option>Q4</option><option>OT</option><option>FINAL</option></select></label>
              <label className="cms-field"><span>Rascals Punkte</span><input type="number" min="0" value={selected.rascalsScore} onChange={(event) => setSelected({ ...selected, rascalsScore: Math.max(0, Number(event.target.value)) })} /></label>
              <label className="cms-field"><span>Gegner Punkte</span><input type="number" min="0" value={selected.opponentScore} onChange={(event) => setSelected({ ...selected, opponentScore: Math.max(0, Number(event.target.value)) })} /></label>
            </div>
            <div className="quick-score"><span>Schnell ändern:</span><button onClick={() => setSelected({ ...selected, rascalsScore: selected.rascalsScore + 6 })}>Rascals +6</button><button onClick={() => setSelected({ ...selected, rascalsScore: selected.rascalsScore + 1 })}>+1</button><button onClick={() => setSelected({ ...selected, rascalsScore: selected.rascalsScore + 3 })}>+3</button><button onClick={() => setSelected({ ...selected, opponentScore: selected.opponentScore + 6 })}>Gegner +6</button><button onClick={() => setSelected({ ...selected, opponentScore: selected.opponentScore + 1 })}>+1</button><button onClick={() => setSelected({ ...selected, opponentScore: selected.opponentScore + 3 })}>+3</button></div>
          </AdminCard>

          {selected.id && <AdminCard><div className="cms-section-head"><div><small>SPIELTAG</small><h2>Einfacher Live-Ticker</h2></div><a className="cms-button secondary" href={`/admin/gameday?game=${selected.id}`}>Gameday öffnen →</a></div><p className="cms-muted">Nur wichtige Ereignisse erfassen: Touchdown, Interception, Sack, Halbzeit, Spielende oder Freitext.</p></AdminCard>}
        </div>
      </div>
    </AdminShell>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Noch kein Termin";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ");
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function statusLabel(status: Game["status"]) {
  return ({ upcoming: "KOMMEND", live: "LIVE", final: "FINAL", postponed: "VERSCHOBEN", cancelled: "ABGESAGT" } as const)[status];
}
