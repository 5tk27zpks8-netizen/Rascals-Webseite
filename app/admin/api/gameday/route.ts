import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { requireCmsPermission } from "../../../lib/permissions";

type EventBody = {
  gameId?: string;
  playerId?: string | null;
  eventType?: string;
  quarter?: string;
  gameClock?: string;
  text?: string;
  points?: number;
  team?: "rascals" | "opponent";
};

const AUTO_STAT_BY_EVENT: Record<string, string> = {
  touchdown: "touchdowns",
  interception: "interceptions",
  sack: "sacks",
  forced_fumble: "forced_fumbles",
};

async function authorize() {
  return requireCmsPermission("gameday");
}

async function ensureAssignments() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS game_gameday_assignments (
    game_id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function mapEvent(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    gameId: String(row.game_id),
    playerId: row.player_id ? String(row.player_id) : null,
    team: String(row.team ?? "rascals"),
    eventType: String(row.event_type ?? "custom"),
    points: Number(row.points ?? 0),
    quarter: String(row.quarter ?? ""),
    gameClock: String(row.game_clock ?? ""),
    text: String(row.text ?? ""),
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export async function GET(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureAssignments();
  const url = new URL(request.url);
  const { DB } = bindings();

  if (url.searchParams.get("base") === "1") {
    const gamesResult = actor.role === "gameday"
      ? await DB.prepare(`SELECT g.*, COALESCE(a.user_email,'') AS gameday_assignee
          FROM games g LEFT JOIN game_gameday_assignments a ON a.game_id=g.id
          WHERE lower(COALESCE(a.user_email,''))=lower(?)
          ORDER BY CASE g.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, COALESCE(g.kickoff,'9999-12-31')`)
          .bind(actor.email).all<Record<string, unknown>>()
      : await DB.prepare(`SELECT g.*, COALESCE(a.user_email,'') AS gameday_assignee
          FROM games g LEFT JOIN game_gameday_assignments a ON a.game_id=g.id
          ORDER BY CASE g.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, COALESCE(g.kickoff,'9999-12-31')`).all<Record<string, unknown>>();

    const playersResult = await DB.prepare(`SELECT id, first_name, last_name, jersey_number, position
      FROM players WHERE active=1 ORDER BY jersey_number, last_name`).all<Record<string, unknown>>();

    return Response.json({
      current: actor,
      games: gamesResult.results.map((row) => ({
        id: String(row.id), opponent: String(row.opponent ?? ""), opponentLogo: String(row.opponent_logo ?? ""),
        status: String(row.status ?? "upcoming"), rascalsScore: Number(row.rascals_score ?? 0), opponentScore: Number(row.opponent_score ?? 0),
        quarter: String(row.quarter ?? ""), gameClock: String(row.game_clock ?? ""), gamedayAssignee: String(row.gameday_assignee ?? ""),
      })),
      players: playersResult.results.map((row) => ({
        id: String(row.id), firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""),
        jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number), position: String(row.position ?? ""),
      })),
    });
  }

  const gameId = url.searchParams.get("game");
  if (!gameId) return Response.json({ error: "game fehlt." }, { status: 400 });
  if (actor.role === "gameday") {
    const assigned = await DB.prepare("SELECT 1 FROM game_gameday_assignments WHERE game_id=? AND lower(user_email)=lower(?) LIMIT 1").bind(gameId, actor.email).first();
    if (!assigned) return Response.json({ error: "Dieses Spiel ist dir nicht als Liveticker zugewiesen." }, { status: 403 });
  }
  const result = await DB.prepare("SELECT * FROM game_events WHERE game_id=? ORDER BY created_at DESC").bind(gameId).all<Record<string, unknown>>();
  return Response.json({ items: result.results.map(mapEvent) });
}

export async function POST(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureAssignments();
  const body = await request.json() as EventBody;
  if (!body.gameId || !body.eventType) return Response.json({ error: "Spiel und Ereignis sind erforderlich." }, { status: 400 });
  const { DB } = bindings();
  if (actor.role === "gameday") {
    const assigned = await DB.prepare("SELECT 1 FROM game_gameday_assignments WHERE game_id=? AND lower(user_email)=lower(?) LIMIT 1").bind(body.gameId, actor.email).first();
    if (!assigned) return Response.json({ error: "Dieses Spiel ist dir nicht als Liveticker zugewiesen." }, { status: 403 });
  }

  const id = crypto.randomUUID();
  const team = body.team ?? "rascals";
  const statements = [
    DB.prepare(`INSERT INTO game_events (id,game_id,player_id,team,event_type,points,quarter,game_clock,text,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
        id, body.gameId, body.playerId ?? null, team, body.eventType, Number(body.points ?? 0), body.quarter ?? "", body.gameClock ?? "", body.text ?? "", actor.email
      ),
  ];

  const statKey = team === "rascals" && body.playerId ? AUTO_STAT_BY_EVENT[body.eventType] : undefined;
  if (statKey) {
    statements.push(
      DB.prepare(`INSERT INTO player_game_stats (id,player_id,game_id,season,stat_key,stat_value)
        VALUES (?,?,?,?,?,?)`).bind(`gameday:${id}`, body.playerId, body.gameId, 2026, statKey, 1),
    );
  }

  await DB.batch(statements);
  const row = await DB.prepare("SELECT * FROM game_events WHERE id=?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: mapEvent(row!), autoStat: statKey ?? null }, { status: 201 });
}

export async function DELETE(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureAssignments();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  const { DB } = bindings();
  if (actor.role === "gameday") {
    const event = await DB.prepare("SELECT game_id FROM game_events WHERE id=? LIMIT 1").bind(id).first<{ game_id: string }>();
    if (!event) return Response.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
    const assigned = await DB.prepare("SELECT 1 FROM game_gameday_assignments WHERE game_id=? AND lower(user_email)=lower(?) LIMIT 1").bind(event.game_id, actor.email).first();
    if (!assigned) return Response.json({ error: "Dieses Spiel ist dir nicht als Liveticker zugewiesen." }, { status: 403 });
  }

  await DB.batch([
    DB.prepare("DELETE FROM player_game_stats WHERE id=?").bind(`gameday:${id}`),
    DB.prepare("DELETE FROM game_events WHERE id=?").bind(id),
  ]);
  return Response.json({ ok: true });
}
