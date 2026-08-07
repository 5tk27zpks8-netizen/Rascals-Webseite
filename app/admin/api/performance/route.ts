import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { ensurePerformanceSchema, mapPerformanceEntry, performanceIndex } from "../../../lib/performance";
import { requireCmsPermission } from "../../../lib/permissions";

type EntryBody = {
  playerId?: string;
  context?: "training" | "game" | "review";
  contextId?: string | null;
  occurredAt?: string;
  attendance?: "present" | "excused" | "absent" | "injured" | "none";
  effort?: number | null;
  execution?: number | null;
  discipline?: number | null;
  impact?: number | null;
  overall?: number | null;
  note?: string;
};

function score(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : null;
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance" as never);
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensurePerformanceSchema();
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId");
  const { DB } = bindings();

  if (!playerId) {
    const players = await DB.prepare(`SELECT id, first_name, last_name, jersey_number, position, unit, active
      FROM players WHERE active=1 ORDER BY jersey_number, last_name`).all<Record<string, unknown>>();
    return Response.json({
      current: actor,
      players: players.results.map((row) => ({
        id: String(row.id),
        firstName: String(row.first_name ?? ""),
        lastName: String(row.last_name ?? ""),
        jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
        position: String(row.position ?? ""),
        unit: String(row.unit ?? ""),
      })),
    });
  }

  const entries = await DB.prepare(`SELECT * FROM player_performance_entries
    WHERE player_id=? ORDER BY occurred_at DESC, created_at DESC LIMIT 60`).bind(playerId).all<Record<string, unknown>>();
  const mapped = entries.results.map(mapPerformanceEntry);
  const training = mapped.filter((entry) => entry.context === "training" && entry.attendance !== "none");
  const attendanceEligible = training.filter((entry) => ["present", "absent"].includes(entry.attendance));
  const attendancePct = attendanceEligible.length ? Math.round((attendanceEligible.filter((entry) => entry.attendance === "present").length / attendanceEligible.length) * 100) : null;

  const averages = (key: "effort" | "execution" | "discipline" | "impact" | "overall") => {
    const values = mapped.map((entry) => entry[key]).filter((value): value is number => value != null);
    return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 20) : null;
  };

  const indices = mapped.map(performanceIndex).filter((value): value is number => value != null);
  const trend = mapped.slice(0, 12).reverse().map((entry) => ({
    id: entry.id,
    date: entry.occurredAt,
    context: entry.context,
    index: performanceIndex(entry),
  })).filter((item) => item.index != null);

  const statsResult = await DB.prepare(`SELECT stat_key, SUM(stat_value) AS total FROM player_game_stats
    WHERE player_id=? AND season=2026 GROUP BY stat_key ORDER BY stat_key`).bind(playerId).all<Record<string, unknown>>();

  return Response.json({
    entries: mapped,
    summary: {
      attendancePct,
      effort: averages("effort"),
      execution: averages("execution"),
      discipline: averages("discipline"),
      impact: averages("impact"),
      overall: indices.length ? Math.round(indices.reduce((a, b) => a + b, 0) / indices.length) : null,
      trainingCount: training.length,
      gameReviews: mapped.filter((entry) => entry.context === "game").length,
    },
    trend,
    stats: statsResult.results.map((row) => ({ key: String(row.stat_key), value: Number(row.total ?? 0) })),
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("performance" as never);
  if (actor instanceof Response) return actor;
  await ensurePerformanceSchema();
  const body = await request.json() as EntryBody;
  if (!body.playerId || !body.occurredAt) return Response.json({ error: "Spieler und Datum sind erforderlich." }, { status: 400 });
  const context = ["training", "game"].includes(String(body.context)) ? body.context! : "review";
  const attendance = ["present", "excused", "absent", "injured"].includes(String(body.attendance)) ? body.attendance! : "none";
  const id = crypto.randomUUID();
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO player_performance_entries
    (id,player_id,context,context_id,occurred_at,attendance,effort,execution,discipline,impact,overall,note,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, body.playerId, context, body.contextId ?? null, body.occurredAt, attendance,
      score(body.effort), score(body.execution), score(body.discipline), score(body.impact), score(body.overall), body.note ?? "", actor.email,
    ).run();
  const row = await DB.prepare("SELECT * FROM player_performance_entries WHERE id=?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: mapPerformanceEntry(row!) }, { status: 201 });
}

export async function DELETE(request: Request) {
  const actor = await requireCmsPermission("performance" as never);
  if (actor instanceof Response) return actor;
  await ensurePerformanceSchema();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare("DELETE FROM player_performance_entries WHERE id=?").bind(id).run();
  return Response.json({ ok: true });
}
