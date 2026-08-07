import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { requireCmsPermission } from "../../../lib/permissions";

const allowedStats = new Set(["touchdowns","interceptions","sacks","tackles","forced_fumbles","receiving_td","rushing_td","passing_td","field_goals"]);

async function actor() {
  const result = await requireCmsPermission("achievements");
  return result;
}

export async function GET(request: Request) {
  const auth = await actor();
  if (auth instanceof Response) return auth;
  await ensureFootballSchema();
  const playerId = new URL(request.url).searchParams.get("playerId");
  if (!playerId) return Response.json({ error: "playerId fehlt." }, { status: 400 });
  const { DB } = bindings();
  const [achievements, stats] = await Promise.all([
    DB.prepare("SELECT * FROM player_achievements WHERE player_id=? ORDER BY awarded_at DESC").bind(playerId).all<Record<string, unknown>>(),
    DB.prepare("SELECT stat_key, SUM(stat_value) AS total FROM player_game_stats WHERE player_id=? AND season=2026 GROUP BY stat_key ORDER BY stat_key").bind(playerId).all<Record<string, unknown>>(),
  ]);
  return Response.json({
    achievements: achievements.results.map((row) => ({
      id: String(row.id), playerId: String(row.player_id), gameId: row.game_id ? String(row.game_id) : null,
      type: String(row.type), label: String(row.label), quantity: Number(row.quantity ?? 1), note: String(row.note ?? ""),
      awardedBy: String(row.awarded_by ?? ""), awardedAt: String(row.awarded_at),
    })),
    stats: stats.results.map((row) => ({ key: String(row.stat_key), value: Number(row.total ?? 0) })),
  });
}

export async function POST(request: Request) {
  const auth = await actor();
  if (auth instanceof Response) return auth;
  await ensureFootballSchema();
  const body = await request.json() as { playerId?: string; kind?: "achievement"|"stat"; label?: string; type?: string; quantity?: number; note?: string; statKey?: string; statValue?: number; gameId?: string | null };
  if (!body.playerId) return Response.json({ error: "Spieler fehlt." }, { status: 400 });
  const { DB } = bindings();
  if (body.kind === "stat") {
    const statKey = String(body.statKey ?? "");
    if (!allowedStats.has(statKey)) return Response.json({ error: "Statistik nicht erlaubt." }, { status: 400 });
    const value = Number(body.statValue ?? 0);
    if (!Number.isFinite(value)) return Response.json({ error: "Ungültiger Wert." }, { status: 400 });
    const id = crypto.randomUUID();
    await DB.prepare("INSERT INTO player_game_stats (id,player_id,game_id,season,stat_key,stat_value) VALUES (?,?,?,?,?,?)")
      .bind(id, body.playerId, body.gameId ?? null, 2026, statKey, value).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }
  const label = String(body.label ?? "").trim();
  if (!label) return Response.json({ error: "Bezeichnung fehlt." }, { status: 400 });
  const id = crypto.randomUUID();
  await DB.prepare("INSERT INTO player_achievements (id,player_id,game_id,type,label,quantity,note,awarded_by) VALUES (?,?,?,?,?,?,?,?)")
    .bind(id, body.playerId, body.gameId ?? null, body.type ?? "achievement", label, Math.max(1, Number(body.quantity ?? 1)), body.note ?? "", auth.email).run();
  return Response.json({ ok: true, id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await actor();
  if (auth instanceof Response) return auth;
  await ensureFootballSchema();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const kind = url.searchParams.get("kind");
  if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  const { DB } = bindings();
  if (kind === "stat") await DB.prepare("DELETE FROM player_game_stats WHERE id=?").bind(id).run();
  else await DB.prepare("DELETE FROM player_achievements WHERE id=?").bind(id).run();
  return Response.json({ ok: true });
}
