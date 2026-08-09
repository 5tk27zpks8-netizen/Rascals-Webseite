import { bindings } from "./cms";
import { ensureStatsSchema, type StatStatus } from "./stats";

export type StatAuditAction = "value-adjustment" | "status-transition";

export async function ensureStatAuditSchema() {
  await ensureStatsSchema();
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS stat_revisions (
      id TEXT PRIMARY KEY,
      stat_id TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      previous_value REAL NOT NULL,
      new_value REAL NOT NULL,
      previous_note TEXT NOT NULL DEFAULT '',
      new_note TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      changed_by TEXT NOT NULL DEFAULT '',
      changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_stat_revisions_stat ON stat_revisions(stat_id,changed_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_stat_revisions_action ON stat_revisions(action,changed_at)"),
  ]);
}

export async function recordStatRevision(input: {
  statId: string;
  action: StatAuditAction;
  fromStatus: StatStatus;
  toStatus: StatStatus;
  previousValue: number;
  newValue: number;
  previousNote?: string;
  newNote?: string;
  reason?: string;
  changedBy: string;
  changedAt?: string;
}) {
  await ensureStatAuditSchema();
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO stat_revisions
    (id,stat_id,action,from_status,to_status,previous_value,new_value,previous_note,new_note,reason,changed_by,changed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      crypto.randomUUID(), input.statId, input.action, input.fromStatus, input.toStatus,
      input.previousValue, input.newValue, input.previousNote ?? "", input.newNote ?? "",
      input.reason?.trim() ?? "", input.changedBy, input.changedAt ?? new Date().toISOString(),
    ).run();
}

export async function getStatRevisionHistory(statIds: string[]) {
  await ensureStatAuditSchema();
  if (!statIds.length) return [];
  const { DB } = bindings();
  const rows = await DB.prepare(`SELECT * FROM stat_revisions WHERE stat_id IN (${statIds.map(() => "?").join(",")}) ORDER BY changed_at DESC`)
    .bind(...statIds).all<Record<string, unknown>>();
  return rows.results.map((row) => ({
    id: String(row.id),
    statId: String(row.stat_id),
    action: String(row.action),
    fromStatus: String(row.from_status),
    toStatus: String(row.to_status),
    previousValue: Number(row.previous_value ?? 0),
    newValue: Number(row.new_value ?? 0),
    previousNote: String(row.previous_note ?? ""),
    newNote: String(row.new_note ?? ""),
    reason: String(row.reason ?? ""),
    changedBy: String(row.changed_by ?? ""),
    changedAt: String(row.changed_at ?? ""),
  }));
}
