import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { ensureGamedayRosterSchema, getActiveGamedayPlayers, getGameSeason, isPlayerActiveForGame } from "../../../lib/gameday-roster";
import { requireCmsPermission } from "../../../lib/permissions";
import { ensureStatsSchema } from "../../../lib/stats";

type EventBody = {
  gameId?: string;
  playerId?: string | null;
  eventType?: string;
  quarter?: string;
  gameClock?: string;
  text?: string;
  points?: number;
  team?: "rascals" | "opponent";
  idempotencyKey?: string;
};

const AUTO_STAT_BY_EVENT: Record<string, string> = {
  touchdown: "touchdowns",
  interception: "interceptions",
  sack: "sacks",
  forced_fumble: "forced_fumbles",
};

async function authorize() { return requireCmsPermission("gameday"); }

async function ensureAssignments() {
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS game_gameday_assignments (
      game_id TEXT PRIMARY KEY,user_email TEXT NOT NULL,assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS game_event_requests (
      game_id TEXT NOT NULL,request_key TEXT NOT NULL,event_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (game_id,request_key))`),
    DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_game_event_request_event ON game_event_requests(event_id)"),
  ]);
}

function mapEvent(row: Record<string, unknown>) {
  return {
    id: String(row.id), gameId: String(row.game_id), playerId: row.player_id ? String(row.player_id) : null,
    team: String(row.team ?? "rascals"), eventType: String(row.event_type ?? "custom"), points: Number(row.points ?? 0),
    quarter: String(row.quarter ?? ""), gameClock: String(row.game_clock ?? ""), text: String(row.text ?? ""),
    createdBy: String(row.created_by ?? ""), createdAt: String(row.created_at ?? ""),
  };
}

async function fallbackPlayers() {
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT id,first_name,last_name,jersey_number,position FROM players WHERE active=1 ORDER BY jersey_number,last_name`).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: String(row.id), firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""),
    jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number), position: String(row.position ?? ""),
  }));
}

export async function GET(request: Request) {
  const actor = await authorize(); if (actor instanceof Response) return actor;
  await ensureFootballSchema(); await ensureAssignments(); await ensureGamedayRosterSchema(); await ensureStatsSchema();
  const url = new URL(request.url); const { DB } = bindings();

  if (url.searchParams.get("base") === "1") {
    const gamesResult = actor.role === "gameday"
      ? await DB.prepare(`SELECT g.*,COALESCE(a.user_email,'') AS gameday_assignee FROM games g LEFT JOIN game_gameday_assignments a ON a.game_id=g.id
          WHERE lower(COALESCE(a.user_email,''))=lower(?) ORDER BY CASE g.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,COALESCE(g.kickoff,'9999-12-31')`).bind(actor.email).all<Record<string, unknown>>()
      : await DB.prepare(`SELECT g.*,COALESCE(a.user_email,'') AS gameday_assignee FROM games g LEFT JOIN game_gameday_assignments a ON a.game_id=g.id
          ORDER BY CASE g.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,COALESCE(g.kickoff,'9999-12-31')`).all<Record<string, unknown>>();
    return Response.json({ current: actor, games: gamesResult.results.map((row) => ({
      id: String(row.id), opponent: String(row.opponent ?? ""), opponentLogo: String(row.opponent_logo ?? ""), status: String(row.status ?? "upcoming"),
      rascalsScore: Number(row.rascals_score ?? 0), opponentScore: Number(row.opponent_score ?? 0), quarter: String(row.quarter ?? ""),
      gameClock: String(row.game_clock ?? ""), gamedayAssignee: String(row.gameday_assignee ?? ""),
    })), players: await fallbackPlayers() });
  }

  const gameId = url.searchParams.get("game"); if (!gameId) return Response.json({ error: "game fehlt." }, { status: 400 });
  if (actor.role === "gameday") {
    const assigned = await DB.prepare("SELECT 1 FROM game_gameday_assignments WHERE game_id=? AND lower(user_email)=lower(?) LIMIT 1").bind(gameId, actor.email).first();
    if (!assigned) return Response.json({ error: "Dieses Spiel ist dir nicht als Liveticker zugewiesen." }, { status: 403 });
  }
  const result = await DB.prepare("SELECT * FROM game_events WHERE game_id=? ORDER BY created_at DESC").bind(gameId).all<Record<string, unknown>>();
  const gamedayPlayers = await getActiveGamedayPlayers(gameId);
  return Response.json({ items: result.results.map(mapEvent), players: gamedayPlayers.length ? gamedayPlayers : await fallbackPlayers(), rosterApplied: gamedayPlayers.length > 0,
    rosterSource: gamedayPlayers[0]?.source ?? null, rosterRevisionId: gamedayPlayers[0]?.revisionId ?? null });
}

export async function POST(request: Request) {
  const actor = await authorize(); if (actor instanceof Response) return actor;
  await ensureFootballSchema(); await ensureAssignments(); await ensureGamedayRosterSchema(); await ensureStatsSchema();
  const body = await request.json() as EventBody;
  if (!body.gameId || !body.eventType) return Response.json({ error: "Spiel und Ereignis sind erforderlich." }, { status: 400 });
  const { DB } = bindings();
  if (actor.role === "gameday") {
    const assigned = await DB.prepare("SELECT 1 FROM game_gameday_assignments WHERE game_id=? AND lower(user_email)=lower(?) LIMIT 1").bind(body.gameId, actor.email).first();
    if (!assigned) return Response.json({ error: "Dieses Spiel ist dir nicht als Liveticker zugewiesen." }, { status: 403 });
  }

  if (body.playerId) {
    const rosterControl = await DB.prepare("SELECT status FROM gameday_roster_control WHERE game_id=? LIMIT 1").bind(body.gameId).first<{ status: string }>();
    if (rosterControl && !(await isPlayerActiveForGame(body.gameId, body.playerId))) {
      return Response.json({ error: "Dieser Spieler steht für dieses Spiel nicht auf dem aktiven Gameday-Roster." }, { status: 409 });
    }
  }

  const requestKey = (request.headers.get("Idempotency-Key") || body.idempotencyKey || "").trim();
  if (requestKey) {
    const prior = await DB.prepare(`SELECT e.* FROM game_event_requests r JOIN game_events e ON e.id=r.event_id WHERE r.game_id=? AND r.request_key=? LIMIT 1`)
      .bind(body.gameId, requestKey).first<Record<string, unknown>>();
    if (prior) {
      const linked = await DB.prepare("SELECT stat_key,status FROM player_game_stats WHERE source='gameday' AND source_event_id=? LIMIT 1").bind(String(prior.id)).first<Record<string,unknown>>();
      return Response.json({ item: mapEvent(prior), autoStat: linked?.stat_key ? String(linked.stat_key) : null, autoStatStatus: linked?.status ? String(linked.status) : null, idempotentReplay: true });
    }
  }

  const id = crypto.randomUUID(); const team = body.team ?? "rascals";
  const statements = [DB.prepare(`INSERT INTO game_events (id,game_id,player_id,team,event_type,points,quarter,game_clock,text,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id, body.gameId, body.playerId ?? null, team, body.eventType, Number(body.points ?? 0), body.quarter ?? "", body.gameClock ?? "", body.text ?? "", actor.email)];

  if (requestKey) statements.push(DB.prepare("INSERT INTO game_event_requests (game_id,request_key,event_id) VALUES (?,?,?)").bind(body.gameId, requestKey, id));

  const statKey = team === "rascals" && body.playerId ? AUTO_STAT_BY_EVENT[body.eventType] : undefined;
  if (statKey) {
    const season = await getGameSeason(body.gameId); const seasonYear = Number(season?.year ?? new Date().getFullYear()); const seasonId = String(season?.season_id ?? "");
    statements.push(DB.prepare(`INSERT INTO player_game_stats
        (id,player_id,game_id,season,season_id,stat_key,stat_value,status,source,source_event_id,note,created_by)
        SELECT ?,?,?,?,?,?,1,'provisional','gameday',?,?,? WHERE NOT EXISTS (
          SELECT 1 FROM player_game_stats WHERE source='gameday' AND source_event_id=? AND player_id=? AND stat_key=?
        )`).bind(`gameday:${id}`, body.playerId, body.gameId, seasonYear, seasonId || null, statKey, id, body.text ?? "", actor.email, id, body.playerId, statKey));
  }

  await DB.batch(statements);
  const row = await DB.prepare("SELECT * FROM game_events WHERE id=?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: mapEvent(row!), autoStat: statKey ?? null, autoStatStatus: statKey ? "provisional" : null, idempotencyKey: requestKey || null }, { status: 201 });
}

export async function DELETE(request: Request) {
  const actor = await authorize(); if (actor instanceof Response) return actor;
  await ensureFootballSchema(); await ensureAssignments(); await ensureStatsSchema();
  const id = new URL(request.url).searchParams.get("id"); if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  const { DB } = bindings();
  if (actor.role === "gameday") {
    const event = await DB.prepare("SELECT game_id FROM game_events WHERE id=? LIMIT 1").bind(id).first<{ game_id: string }>();
    if (!event) return Response.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
    const assigned = await DB.prepare("SELECT 1 FROM game_gameday_assignments WHERE game_id=? AND lower(user_email)=lower(?) LIMIT 1").bind(event.game_id, actor.email).first();
    if (!assigned) return Response.json({ error: "Dieses Spiel ist dir nicht als Liveticker zugewiesen." }, { status: 403 });
  }
  const linkedStat = await DB.prepare("SELECT status FROM player_game_stats WHERE source='gameday' AND source_event_id=? LIMIT 1").bind(id).first<{ status: string }>();
  if (linkedStat && linkedStat.status !== "provisional") return Response.json({ error: "Dieser Ticker-Eintrag besitzt bereits eine reviewed/official Statistik. Status im Stats Review zuerst auf Provisional zurücksetzen." }, { status: 423 });

  await DB.batch([
    DB.prepare("DELETE FROM player_game_stats WHERE source='gameday' AND source_event_id=? AND status='provisional'").bind(id),
    DB.prepare("DELETE FROM game_event_requests WHERE event_id=?").bind(id),
    DB.prepare("DELETE FROM game_events WHERE id=?").bind(id),
  ]);
  return Response.json({ ok: true });
}
