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
  gamedayAssignee: string;
};

type Player = { id: string; firstName: string; lastName: string; jerseyNumber: number | null; position: string };
type Event = { id: string; gameId: string; playerId: string | null; team: string; eventType: string; quarter: string; gameClock: string; text: string; createdAt: string };
type Actor = { email: string; name: string; role: string };

const eventTypes = [
  ["touchdown", "Touchdown"],
  ["interception", "Interception"],
  ["sack", "Sack"],
  ["forced_fumble", "Forced Fumble"],
  ["halftime", "Halbzeit"],
  ["final", "Spielende"],
  ["custom", "Freitext"],
] as const;

const statLabels: Record<string, string> = {
  touchdowns: "Touchdowns",
  interceptions: "Interceptions",
  sacks: "Sacks",
  forced_fumbles: "Forced Fumbles",
};

export function GamedayManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [actor, setActor] = useState<Actor | null>(null);
  const [gameId, setGameId] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [eventType, setEventType] = useState("touchdown");
  const [playerId, setPlayerId] = useState("");
  const [quarter, setQuarter] = useState("");
  const [gameClock, setGameClock] = useState("");
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [rosterApplied, setRosterApplied] = useState(false);

  const currentGame = useMemo(() => games.find((g) => g.id === gameId) ?? null, [games, gameId]);

  useEffect(() => { void loadBase(); }, []);
  useEffect(() => { if (gameId) void loadEvents(gameId); else { setEvents([]); setRosterApplied(false); } }, [gameId]);

  async function loadBase() {
    try {
      const response = await fetch("/admin/api/gameday?base=1");
      if (!response.ok) throw new Error("Gameday-Daten konnten nicht geladen werden.");
      const body = await response.json() as { games: Game[]; players: Player[]; current: Actor };
      setGames(body.games);
      setPlayers(body.players);
      setActor(body.current);
      const fromUrl = new URLSearchParams(window.location.search).get("game");
      setGameId(fromUrl && body.games.some((g) => g.id === fromUrl) ? fromUrl : body.games.find((g) => g.status === "live")?.id ?? body.games[0]?.id ?? "");
      if (body.current.role === "gameday" && !body.games.length) setNotice("Dir ist aktuell kein Spiel für den Liveticker zugewiesen.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Fehler beim Laden.");
    }
  }

  async function loadEvents(id: string) {
    const response = await fetch(`/admin/api/gameday?game=${encodeURIComponent(id)}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setNotice(body.error ?? "Ticker konnte nicht geladen werden.");
      return;
    }
    const body = await response.json() as { items: Event[]; players?: Player[]; rosterApplied?: boolean };
    setEvents(body.items);
    if (body.players) setPlayers(body.players);
    setRosterApplied(Boolean(body.rosterApplied));
    setPlayerId("");
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
      const body = await response.json() as { autoStat?: string | null };
      setText(""); setPlayerId("");
      await loadEvents(gameId);
      setNotice(body.autoStat ? `Ticker-Eintrag veröffentlicht · ${statLabels[body.autoStat] ?? body.autoStat} +1 automatisch beim Spieler.` : "Ticker-Eintrag veröffentlicht.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally { setSaving(false); }
  }

  async function removeEvent(id: string) {
    if (!confirm("Ticker-Eintrag wirklich löschen? Eine automatisch erzeugte Spielerstatistik wird ebenfalls entfernt.")) return;
    const response = await fetch(`/admin/api/gameday?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setNotice(body.error ?? "Löschen fehlgeschlagen."); return; }
    setEvents((current) => current.filter((e) => e.id !== id));
    setNotice("Ticker-Eintrag gelöscht. Verknüpfte Auto-Stat wurde ebenfalls entfernt.");
  }

  return <AdminShell active="gameday" title="Gameday Live-Ticker" actions={gameId ? <a className="cms-button secondary" href={`/admin/gameday-roster?game=${encodeURIComponent(gameId)}`}>Gameday Roster →</a> : undefined}>
    {notice && <AdminNotice tone={notice.includes("veröffentlicht") || notice.includes("gelöscht") ? "success" : "error"}>{notice}</AdminNotice>}

    <div className="gameday-layout">
      <AdminCard>
        <div className="cms-section-head"><div><small>SPIEL</small><h2>Aktuelles Spiel</h2></div>{actor && <span className="cms-muted">Operator: {actor.name || actor.email}</span>}</div>
        <label className="cms-field"><span>Spiel auswählen</span><select value={gameId} onChange={(e) => setGameId(e.target.value)}><option value="">— Spiel wählen —</option>{games.map((game) => <option key={game.id} value={game.id}>{game.status === "live" ? "LIVE · " : ""}Rascals vs {game.opponent}</option>)}</select></label>
        {actor?.role === "gameday" && <p className="cms-muted">Du siehst hier nur Spiele, für die du als Liveticker-Verantwortlicher eingeteilt wurdest.</p>}
        {currentGame && <div className="gameday-score"><div><img src="/rascals-logo-transparent-4k.png" alt=""/><b>RASCALS</b><strong>{currentGame.rascalsScore}</strong></div><span>{currentGame.quarter || currentGame.status.toUpperCase()}</span><div>{currentGame.opponentLogo ? <img src={currentGame.opponentLogo} alt=""/> : <i>?</i>}<b>{currentGame.opponent}</b><strong>{currentGame.opponentScore}</strong></div></div>}
      </AdminCard>

      <AdminCard>
        <div className="cms-section-head"><div><small>NEUER EINTRAG</small><h2>Wichtiges Ereignis</h2></div>{rosterApplied&&<span className="cms-muted">✓ Aktiver Gameday-Roster angewendet</span>}</div>
        <div className="gameday-event-buttons">{eventTypes.map(([key, label]) => <button key={key} className={eventType === key ? "active" : ""} onClick={() => setEventType(key)}>{label}</button>)}</div>
        <p className="cms-muted">Touchdown, Interception, Sack und Forced Fumble werden bei ausgewähltem Spieler automatisch als Saisonstatistik mitgezählt. Sobald ein Gameday-Roster vorhanden ist, können hier nur ACTIVE-Spieler ausgewählt werden.</p>
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
