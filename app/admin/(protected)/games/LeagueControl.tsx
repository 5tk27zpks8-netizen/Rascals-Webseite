"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function LeagueControl() {
  const [target, setTarget] = useState<Element | null>(null);
  const [league, setLeague] = useState("");
  const [season, setSeason] = useState(2026);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const el = document.querySelector(".games-list .cms-section-head");
      if (el) {
        setTarget(el);
        clearInterval(timer);
      }
    }, 50);

    fetch("/admin/api/league")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b) {
          setLeague(b.league || "Bezirksliga");
          setSeason(b.season || 2026);
        }
      });

    return () => clearInterval(timer);
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    const r = await fetch("/admin/api/league", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ league, season }),
    });
    setSaving(false);
    setMessage(r.ok ? "Gespeichert" : "Fehler beim Speichern");
    if (r.ok) window.setTimeout(() => setMessage(""), 2200);
  }

  if (!target) return null;

  return createPortal(
    <div className="league-control">
      <div className="league-control-heading">
        <small>LIGA & SAISON</small>
        <span>Anzeige auf der Startseite</span>
      </div>
      <label className="cms-field league-control-field league-control-league">
        <span>Liga</span>
        <input value={league} onChange={(e) => setLeague(e.target.value)} placeholder="z. B. Bezirksliga" />
      </label>
      <label className="cms-field league-control-field league-control-season">
        <span>Saison</span>
        <input type="number" value={season} onChange={(e) => setSeason(Number(e.target.value) || 2026)} />
      </label>
      <button className="cms-button secondary league-control-save" disabled={saving || !league.trim()} onClick={() => void save()}>
        {saving ? "Speichert…" : "Speichern"}
      </button>
      {message && <small className="league-control-message">{message}</small>}
    </div>,
    target,
  );
}
