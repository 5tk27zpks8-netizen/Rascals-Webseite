import { bindings } from "../../../lib/cms";
import { ensurePerformanceSchema, mapPerformanceEntry, performanceIndex } from "../../../lib/performance";
import { ensureRosterFoundation, isActiveRosterStatus } from "../../../lib/roster";
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

type Row = Record<string, unknown>;

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

async function seasonContext(request: Request) {
  const { DB } = bindings();
  const url = new URL(request.url);
  const rows = await DB.prepare("SELECT id,year,name,status,is_current FROM seasons ORDER BY year DESC").all<Row>();
  const seasons = rows.results.map((row) => ({
    id: String(row.id), year: Number(row.year), name: String(row.name ?? ""),
    status: String(row.status ?? "planning"), isCurrent: Number(row.is_current ?? 0) === 1,
  }));
  const season = seasons.find((item) => item.id === url.searchParams.get("seasonId"))
    ?? seasons.find((item) => item.isCurrent)
    ?? seasons[0]
    ?? null;
  return { url, seasons, season };
}

async function seasonPerformanceEntries(playerId: string, seasonId: string, seasonYear: number) {
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT pe.* FROM player_performance_entries pe
    WHERE pe.player_id=? AND (
      (pe.context='training' AND pe.context_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM training_sessions ts WHERE ts.id=pe.context_id AND ts.season_id=?
      ))
      OR (pe.context='game' AND pe.context_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM games g WHERE g.id=pe.context_id AND g.season_id=?
      ))
      OR (pe.context='review' AND substr(pe.occurred_at,1,4)=?)
      OR (pe.context='training' AND (pe.context_id IS NULL OR pe.context_id='') AND substr(pe.occurred_at,1,4)=?)
      OR (pe.context='game' AND (pe.context_id IS NULL OR pe.context_id='') AND substr(pe.occurred_at,1,4)=?)
    )
    ORDER BY pe.occurred_at DESC,pe.created_at DESC
    LIMIT 2500`).bind(playerId, seasonId, seasonId, String(seasonYear), String(seasonYear), String(seasonYear)).all<Row>();
  return result.results.map(mapPerformanceEntry);
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  await ensurePerformanceSchema();
  await ensureStatsSchema();
  const { DB } = bindings();
  const { url, seasons, season } = await seasonContext(request);
  if (!season) return Response.json({ error: "Keine Saison vorhanden." }, { status: 404 });

  const playerId = url.searchParams.get("playerId");
  const from = url.searchParams.get("from")?.trim() || "";
  const to = url.searchParams.get("to")?.trim() || "";
  const contextFilter = url.searchParams.get("context")?.trim() || "all";

  const rosterRows = await DB.prepare(`SELECT rm.player_id,rm.jersey_number,rm.primary_position,rm.secondary_position,rm.unit,rm.roster_status,
      p.first_name,p.last_name,p.portrait
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND p.active=1
    ORDER BY rm.jersey_number,p.last_name,p.first_name`).bind(season.id).all<Row>();
  const players = rosterRows.results.filter((row) => isActiveRosterStatus(row.roster_status)).map((row) => ({
    id: String(row.player_id), firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""),
    portrait: String(row.portrait ?? ""), jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
    position: String(row.primary_position ?? ""), secondaryPosition: String(row.secondary_position ?? ""),
    unit: String(row.unit ?? ""), rosterStatus: String(row.roster_status ?? "active"),
  }));

  if (!playerId) {
    return Response.json({ current: actor, seasons, season, years: seasons.map((item) => item.year), players });
  }

  if (!players.some((player) => player.id === playerId)) {
    return Response.json({ error: "Spieler gehört nicht zum aktiven Saisonkader." }, { status: 404 });
  }

  let mapped = await seasonPerformanceEntries(playerId, season.id, season.year);
  if (from) mapped = mapped.filter((entry) => entry.occurredAt >= from);
  if (to) mapped = mapped.filter((entry) => entry.occurredAt <= to);
  if (["training", "game", "review"].includes(contextFilter)) mapped = mapped.filter((entry) => entry.context === contextFilter);

  const training = mapped.filter((entry) => entry.context === "training" && entry.attendance !== "none");
  const attendanceEligible = training.filter((entry) => ["present", "absent"].includes(entry.attendance));
  const attendancePct = attendanceEligible.length
    ? Math.round((attendanceEligible.filter((entry) => entry.attendance === "present").length / attendanceEligible.length) * 100)
    : null;

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
      effort: avg100(rows.map((entry) => entry.effort)), execution: avg100(rows.map((entry) => entry.execution)),
      discipline: avg100(rows.map((entry) => entry.discipline)), impact: avg100(rows.map((entry) => entry.impact)), entries: rows.length,
    };
  });

  const trend = mapped.slice(0, 80).reverse().map((entry) => ({
    id: entry.id, date: entry.occurredAt, context: entry.context, index: performanceIndex(entry),
  })).filter((item) => item.index != null);

  const statsResult = await DB.prepare(`SELECT pgs.stat_key,SUM(pgs.stat_value) AS total
    FROM player_game_stats pgs
    WHERE pgs.player_id=? AND pgs.season_id=? AND pgs.status='official'
    GROUP BY pgs.stat_key ORDER BY pgs.stat_key`).bind(playerId, season.id).all<Row>();

  return Response.json({
    current: actor, seasons, season, players,
    range: { from: from || null, to: to || null, context: contextFilter },
    years: seasons.map((item) => item.year),
    entries: mapped,
    summary: {
      attendancePct, effort: averages("effort"), execution: averages("execution"), discipline: averages("discipline"), impact: averages("impact"),
      overall: indices.length ? Math.round(indices.reduce((a, b) => a + b, 0) / indices.length) : null,
      trainingCount: training.length, gameReviews: mapped.filter((entry) => entry.context === "game").length, totalEntries: mapped.length,
    },
    trend, monthly, statsSource: "official", statsSeasonId: season.id,
    stats: statsResult.results.map((row) => ({ key: String(row.stat_key), value: Number(row.total ?? 0) })),
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  await ensurePerformanceSchema();
  const body = await request.json() as EntryBody;
  if (!body.playerId || !body.occurredAt) return Response.json({ error: "Spieler und Datum sind erforderlich." }, { status: 400 });
  const { season } = await seasonContext(request);
  if (!season) return Response.json({ error: "Keine Saison vorhanden." }, { status: 404 });
  const { DB } = bindings();
  const membership = await DB.prepare("SELECT roster_status FROM roster_memberships WHERE season_id=? AND team_id='mens' AND player_id=? LIMIT 1")
    .bind(season.id, body.playerId).first<Row>();
  if (!membership || !isActiveRosterStatus(membership.roster_status)) return Response.json({ error: "Spieler gehört nicht zum aktiven Saisonkader." }, { status: 409 });

  const context = ["training", "game"].includes(String(body.context)) ? body.context! : "review";
  const attendance = ["present", "excused", "absent", "injured"].includes(String(body.attendance)) ? body.attendance! : "none";
  if (context === "training" && body.contextId) {
    const valid = await DB.prepare("SELECT id FROM training_sessions WHERE id=? AND season_id=? LIMIT 1").bind(body.contextId, season.id).first<Row>();
    if (!valid) return Response.json({ error: "Training gehört nicht zur ausgewählten Saison." }, { status: 409 });
  }
  if (context === "game" && body.contextId) {
    const valid = await DB.prepare("SELECT id FROM games WHERE id=? AND season_id=? LIMIT 1").bind(body.contextId, season.id).first<Row>();
    if (!valid) return Response.json({ error: "Spiel gehört nicht zur ausgewählten Saison." }, { status: 409 });
  }

  const id = crypto.randomUUID();
  await DB.prepare(`INSERT INTO player_performance_entries
    (id,player_id,context,context_id,occurred_at,attendance,effort,execution,discipline,impact,overall,note,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, body.playerId, context, body.contextId ?? null, body.occurredAt, attendance,
      score(body.effort), score(body.execution), score(body.discipline), score(body.impact), score(body.overall), body.note ?? "", actor.email,
    ).run();
  const row = await DB.prepare("SELECT * FROM player_performance_entries WHERE id=?").bind(id).first<Row>();
  return Response.json({ item: mapPerformanceEntry(row!), seasonId: season.id }, { status: 201 });
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
