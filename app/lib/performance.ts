import { bindings } from "./cms";
import { ensureFootballSchema } from "./football";

export type PerformanceContext = "training" | "game" | "review";
export type AttendanceStatus = "present" | "excused" | "absent" | "injured" | "none";

export type PerformanceEntry = {
  id: string;
  playerId: string;
  context: PerformanceContext;
  contextId: string | null;
  occurredAt: string;
  attendance: AttendanceStatus;
  effort: number | null;
  execution: number | null;
  discipline: number | null;
  impact: number | null;
  overall: number | null;
  note: string;
  createdBy: string;
  createdAt: string;
};

export async function ensurePerformanceSchema() {
  await ensureFootballSchema();
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS player_performance_entries (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      context TEXT NOT NULL DEFAULT 'review',
      context_id TEXT,
      occurred_at TEXT NOT NULL,
      attendance TEXT NOT NULL DEFAULT 'none',
      effort REAL,
      execution REAL,
      discipline REAL,
      impact REAL,
      overall REAL,
      note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_performance_player ON player_performance_entries(player_id, occurred_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_performance_context ON player_performance_entries(context, occurred_at)"),
  ]);
  // Development skills are intentionally not owned here anymore.
  // app/lib/development.ts is the canonical owner for skill definitions/evaluations.
}

function nullableScore(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(1, Math.min(5, number));
}

export function mapPerformanceEntry(row: Record<string, unknown>): PerformanceEntry {
  const context = ["training", "game"].includes(String(row.context)) ? String(row.context) as PerformanceContext : "review";
  const attendance = ["present", "excused", "absent", "injured"].includes(String(row.attendance)) ? String(row.attendance) as AttendanceStatus : "none";
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    context,
    contextId: row.context_id ? String(row.context_id) : null,
    occurredAt: String(row.occurred_at),
    attendance,
    effort: nullableScore(row.effort),
    execution: nullableScore(row.execution),
    discipline: nullableScore(row.discipline),
    impact: nullableScore(row.impact),
    overall: nullableScore(row.overall),
    note: String(row.note ?? ""),
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export function performanceIndex(entry: Pick<PerformanceEntry, "effort" | "execution" | "discipline" | "impact" | "overall">) {
  if (entry.overall != null) return Math.round(entry.overall * 20);
  const weighted = [
    [entry.effort, 0.25],
    [entry.execution, 0.35],
    [entry.discipline, 0.15],
    [entry.impact, 0.25],
  ] as const;
  const used = weighted.filter(([value]) => value != null);
  const weight = used.reduce((sum, [, w]) => sum + w, 0);
  if (!weight) return null;
  return Math.round((used.reduce((sum, [value, w]) => sum + Number(value) * w, 0) / weight) * 20);
}

/** Compatibility export. Canonical skill-need logic lives in app/lib/development.ts. */
export function developmentNeedScore(current: number, target: number, priority: number) {
  const gap = Math.max(0, target - current);
  return Math.round((gap / 4) * (Math.max(1, Math.min(3, priority)) / 3) * 100);
}
