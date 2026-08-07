"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminCard, AdminNotice, AdminShell } from "../_components/AdminShell";
import "./gameday.css";

type Game = {
  id: string;
  opponent: string;
  opponentLogo: string;
  status: string;
  rascalsScore: number;
  opponentScore: number;
  quarter: string;
  gameClock: string;
};

type Player = { id: string; firstName: string; lastName: string; jerseyNumber: number | null; position: string };
type Event = { id: string; gameId: string; playerId: string | null; team: string; eventType: string; quarter: string; gameClock: string; text: string; createdAt: string };

const eventTypes = [
  ["touchdown", "Touchdown"],
  ["interception", "Interception"],
  ["sack", "Sack"],
  ["halftime", "Halbzeit"],
  ["final", "Spielende"],
  ["custom", "Freitext"],
] as const;

export function GamedayManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameId, setGameId] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [eventType, setEventType] = useState("touchdown");
  const [playerId, setPlayerId] = useState("");
  const [quarter, setQuarter] = useState("");
  const [gameClock, setGameClock] = useState("");
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const currentGame = useMemo(() => games.find((g) => g.id === gameId) ?? null, [games, gameId]);

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (gameId) void loadEvents(gameId); }, [gameId]);

  async function loadBase() {
    try {
      const [gamesRes, playersRes] = await Promise.all([fetch("/admin/api/games"), fetch("/admin/api/players")]);
      if (!gamesRes.ok) throw new Error("Spiele konnten nicht geladen werden.");
      const gamesBody = await gamesRes.json() as { items: Game[] };
      const playersBody = playersRes.ok ? await playersRes.json() as { items: Player[] } : { items: [] };
      setGames(gamesBody.items);
      setPlayers(playersBody.items);
      const fromUrl = new URLSearchParams(window.location.search).get("game");
      setGameId(fromUrl && gamesBody.items.some((g) => g.id === fromUrl) ? fromUrl : gamesBody.items.find((g) => g.status === "live")?.id ?? gamesBody.items[0]?.id ?? "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Fehler beim Laden.");
    }
  }

  async function loadEvents(id: string) {
    const response = await fetch(`/admin/api/gameday?game=${encodeURIComponent(id)}`);
    if (!response.ok) { setNotice("Ticker konnte nicht geladen werden."); return; }
    const body = await response.json() as { items: Event[] };
    setEvents(body.items);
  }

  async function addEvent() {
    if (!gameId) { setNotice("Bitte zuerst ein Spiel auswählen."); return; }
    setSaving(true); setNotice("");
    try {
      const response = await fetch("/admin/api/gameday", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameId, playerId: playerId || null, eventType, quarter, gameClock, text, team: "rascals" }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Ticker-Eintrag konnte nicht gespeichert werden.");
      }
      setText(""); setPlayerId("");
      await loadEvents(gameId);
      setNotice("Ticker-Eintrag veröffentlicht.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally { setSaving(false); }
  }

  async function removeEvent(id: string) {
    if (!confirm("Ticker-Eintrag wirklich löschen?")) return;
    const response = await fetch(`/admin/api/gameday?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { setNotice("Löschen fehlgeschlagen."); return; }
    setEvents((current) => current.filter((e) => e.id !== id));
    setNotice("Ticker-Eintrag gelöscht.");
  }

  return <AdminShell active="gameday" title="Gameday Live-Ticker">
    {notice && <AdminNotice tone={notice.includes("veröffentlicht") || notice.includes("gelöscht") ? "success" : "error"}>{notice}</AdminNotice>}

    <div className="gameday-layout">
      <AdminCard>
        <div className="cms-section-head"><div><small>SPIEL</small><h2>Aktuelles Spiel</h2></div></div>
        <label className="cms-field"><span>Spiel auswählen</span><select value={gameId} onChange={(e) => setGameId(e.target.value)}><option value="">— Spiel wählen —</option>{games.map((game) => <option key={game.id} value={game.id}>{game.status === "live" ? "LIVE · " : ""}Rascals vs {game.opponent}</option>)}</select></label>
        {currentGame && <div className="gameday-score"><div><img src="/rascals-logo-transparent-4k.png" alt=""/><b>RASCALS</b><strong>{currentGame.rascalsScore}</strong></div><span>{currentGame.quarter || currentGame.status.toUpperCase()}</span><div>{currentGame.opponentLogo ? <img src={currentGame.opponentLogo} alt=""/> : <i>?</i>}<b>{currentGame.opponent}</b><strong>{currentGame.opponentScore}</strong></div></div>}
      </AdminCard>

      <AdminCard>
        <div className="cms-section-head"><div><small>NEUER EINTRAG</small><h2>Wichtiges Ereignis</h2></div></div>
        <div className="gameday-event-buttons">{eventTypes.map(([key, label]) => <button key={key} className={eventType === key ? "active" : ""} onClick={() => setEventType(key)}>{label}</button>)}</div>
        <div className="cms-grid-2 gameday-form">
          <label className="cms-field"><span>Spieler (optional)</span><select value={playerId} onChange={(e) => setPlayerId(e.target.value)}><option value="">Kein Spieler</option>{players.map((p) => <option key={p.id} value={p.id}>#{p.jerseyNumber ?? "—"} {p.firstName} {p.lastName} · {p.position}</option>)}</select></label>
          <label className="cms-field"><span>Quarter</span><select value={quarter} onChange={(e) => setQuarter(e.target.value)}><option value="">—</option><option>Q1</option><option>Q2</option><option>HALFTIME</option><option>Q3</option><option>Q4</option><option>OT</option><option>FINAL</option></select></label>
          <label className="cms-field"><span>Spielzeit (optional)</span><input value={gameClock} onChange={(e) => setGameClock(e.target.value)} placeholder="z. B. 08:24" /></label>
          <label className="cms-field"><span>Kommentar</span><input value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Pick Six über 35 Yards" /></label>
        </div>
        <button className="cms-button" disabled={saving || !gameId} onClick={() => void addEvent()}>{saving ? "Veröffentlicht…" : "Eintrag veröffentlichen"}</button>
      </AdminCard>

      <AdminCard>
        <div className="cms-section-head"><div><small>LIVE-TICKER</small><h2>{events.length} Einträge</h2></div></div>
        <div className="gameday-events">{events.map((event) => {
          const player = players.find((p) => p.id === event.playerId);
          return <div key={event.id} className="gameday-event"><span><b>{labelFor(event.eventType)}</b><small>{[event.quarter, event.gameClock].filter(Boolean).join(" · ") || "—"}</small></span><p>{player ? `#${player.jerseyNumber ?? "—"} ${player.firstName} ${player.lastName}${event.text ? ` · ${event.text}` : ""}` : event.text || labelFor(event.eventType)}</p><button onClick={() => void removeEvent(event.id)}>Löschen</button></div>;
        })}</div>
        {!events.length && <p className="cms-muted">Noch keine Ticker-Einträge für dieses Spiel.</p>}
      </AdminCard>
    </div>
  </AdminShell>;
}

function labelFor(type: string) {
  return eventTypes.find(([key]) => key === type)?.[1] ?? "Update";
}
