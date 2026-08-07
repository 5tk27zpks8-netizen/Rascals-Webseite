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

async function authorize() {
  return requireCmsPermission("gameday");
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
  const gameId = new URL(request.url).searchParams.get("game");
  if (!gameId) return Response.json({ error: "game fehlt." }, { status: 400 });
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM game_events WHERE game_id=? ORDER BY created_at DESC").bind(gameId).all<Record<string, unknown>>();
  return Response.json({ items: result.results.map(mapEvent) });
}

export async function POST(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  const body = await request.json() as EventBody;
  if (!body.gameId || !body.eventType) return Response.json({ error: "Spiel und Ereignis sind erforderlich." }, { status: 400 });
  const id = crypto.randomUUID();
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO game_events (id,game_id,player_id,team,event_type,points,quarter,game_clock,text,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
      id, body.gameId, body.playerId ?? null, body.team ?? "rascals", body.eventType, Number(body.points ?? 0), body.quarter ?? "", body.gameClock ?? "", body.text ?? "", actor.email
    ).run();
  const row = await DB.prepare("SELECT * FROM game_events WHERE id=?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: mapEvent(row!) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  await ensureFootballSchema();
  const { DB } = bindings();
  await DB.prepare("DELETE FROM game_events WHERE id=?").bind(id).run();
  return Response.json({ ok: true });
}
