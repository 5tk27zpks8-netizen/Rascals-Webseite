import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { ensurePerformanceSchema, mapPerformanceEntry, performanceIndex } from "../../../lib/performance";
import { ensureStatsSchema } from "../../../lib/stats";
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

type PeriodBucket = {
  period: string;
  label: string;
  overall: number | null;
  attendancePct: number | null;
  effort: number | null;
  execution: number | null;
  discipline: number | null;
  impact: number | null;
  entries: number;
};

function score(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : null;
}

function avg100(values: Array<number | null>) {
  const clean = values.filter((value): value is number => value != null);
  return clean.length ? Math.round((clean.reduce((a, b) => a + b, 0) / clean.length) * 20) : null;
}

function periodLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, Math.max(0, (month || 1) - 1), 1);
  return new Intl.DateTimeFormat("de-DE", { month: "short", year: "numeric" }).format(date);
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensurePerformanceSchema();
  await ensureStatsSchema();
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId");
  const from = url.searchParams.get("from")?.trim() || "";
  const to = url.searchParams.get("to")?.trim() || "";
  const contextFilter = url.searchParams.get("context")?.trim() || "all";
  const { DB } = bindings();

  if (!playerId) {
    const players = await DB.prepare(`SELECT id, first_name, last_name, jersey_number, position, unit, active
      FROM players WHERE active=1 ORDER BY jersey_number, last_name`).all<Record<string, unknown>>();
    const yearsResult = await DB.prepare(`SELECT DISTINCT substr(occurred_at,1,4) AS year
      FROM player_performance_entries WHERE occurred_at IS NOT NULL AND length(occurred_at)>=4 ORDER BY year DESC`).all<Record<string, unknown>>();
    const years = yearsResult.results.map((row) => Number(row.year)).filter((year) => Number.isFinite(year));
    return Response.json({
      current: actor,
      years,
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

  const clauses = ["player_id=?"];
  const values: Array<string> = [playerId];
  if (from) { clauses.push("occurred_at>=?"); values.push(from); }
  if (to) { clauses.push("occurred_at<=?"); values.push(to); }
  if (["training", "game", "review"].includes(contextFilter)) { clauses.push("context=?"); values.push(contextFilter); }

  const entries = await DB.prepare(`SELECT * FROM player_performance_entries
    WHERE ${clauses.join(" AND ")} ORDER BY occurred_at DESC, created_at DESC LIMIT 2500`).bind(...values).all<Record<string, unknown>>();
  const mapped = entries.results.map(mapPerformanceEntry);
  const training = mapped.filter((entry) => entry.context === "training" && entry.attendance !== "none");
  const attendanceEligible = training.filter((entry) => ["present", "absent"].includes(entry.attendance));
  const attendancePct = attendanceEligible.length ? Math.round((attendanceEligible.filter((entry) => entry.attendance === "present").length / attendanceEligible.length) * 100) : null;

  const averages = (key: "effort" | "execution" | "discipline" | "impact" | "overall") => avg100(mapped.map((entry) => entry[key]));
  const indices = mapped.map(performanceIndex).filter((value): value is number => value != null);

  const monthlyMap = new Map<string, typeof mapped>();
  for (const entry of [...mapped].reverse()) {
    const period = entry.occurredAt.slice(0, 7);
    if (!monthlyMap.has(period)) monthlyMap.set(period, []);
    monthlyMap.get(period)!.push(entry);
  }
  const monthly: PeriodBucket[] = [...monthlyMap.entries()].map(([period, rows]) => {
    const trainingRows = rows.filter((entry) => entry.context === "training" && ["present", "absent"].includes(entry.attendance));
    const periodIndices = rows.map(performanceIndex).filter((value): value is number => value != null);
    return {
      period,
      label: periodLabel(period),
      overall: periodIndices.length ? Math.round(periodIndices.reduce((a, b) => a + b, 0) / periodIndices.length) : null,
      attendancePct: trainingRows.length ? Math.round((trainingRows.filter((entry) => entry.attendance === "present").length / trainingRows.length) * 100) : null,
      effort: avg100(rows.map((entry) => entry.effort)),
      execution: avg100(rows.map((entry) => entry.execution)),
      discipline: avg100(rows.map((entry) => entry.discipline)),
      impact: avg100(rows.map((entry) => entry.impact)),
      entries: rows.length,
    };
  });

  const trend = mapped.slice(0, 80).reverse().map((entry) => ({
    id: entry.id,
    date: entry.occurredAt,
    context: entry.context,
    index: performanceIndex(entry),
  })).filter((item) => item.index != null);

  const startYear = from ? Number(from.slice(0, 4)) : 0;
  const endYear = to ? Number(to.slice(0, 4)) : 9999;
  const statsResult = await DB.prepare(`SELECT stat_key, SUM(stat_value) AS total FROM player_game_stats
    WHERE player_id=? AND season>=? AND season<=? AND status='official'
    GROUP BY stat_key ORDER BY stat_key`).bind(playerId, startYear, endYear).all<Record<string, unknown>>();

  const availableYears = await DB.prepare(`SELECT DISTINCT substr(occurred_at,1,4) AS year FROM player_performance_entries
    WHERE player_id=? AND occurred_at IS NOT NULL ORDER BY year DESC`).bind(playerId).all<Record<string, unknown>>();

  return Response.json({
    range: { from: from || null, to: to || null, context: contextFilter },
    years: availableYears.results.map((row) => Number(row.year)).filter((year) => Number.isFinite(year)),
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
      totalEntries: mapped.length,
    },
    trend,
    monthly,
    statsSource: "official",
    stats: statsResult.results.map((row) => ({ key: String(row.stat_key), value: Number(row.total ?? 0) })),
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("performance");
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
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensurePerformanceSchema();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare("DELETE FROM player_performance_entries WHERE id=?").bind(id).run();
  return Response.json({ ok: true });
}
