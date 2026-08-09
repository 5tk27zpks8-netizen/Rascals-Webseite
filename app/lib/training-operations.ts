import { bindings } from "./cms";
import { ensurePositionDrills } from "./position-drills";
import { ensurePositionDevelopmentSchema } from "./position-development";

export type TrainingSessionStatus = "draft" | "planned" | "completed" | "cancelled";

export async function ensureTrainingOperationsSchema() {
  await ensurePositionDevelopmentSchema();
  await ensurePositionDrills();
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS training_sessions (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      title TEXT NOT NULL,
      starts_at TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 120,
      status TEXT NOT NULL DEFAULT 'draft',
      objective TEXT NOT NULL DEFAULT '',
      coach_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS training_periods (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      phase TEXT NOT NULL DEFAULT 'team',
      unit TEXT NOT NULL DEFAULT 'team',
      position_group TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL,
      drill_id TEXT,
      minutes INTEGER NOT NULL DEFAULT 10,
      source_type TEXT NOT NULL DEFAULT 'manual',
      source_key TEXT NOT NULL DEFAULT '',
      source_score REAL,
      coaching_points TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS training_session_reviews (
      session_id TEXT PRIMARY KEY,
      completion_pct INTEGER NOT NULL DEFAULT 0,
      execution_rating INTEGER,
      intensity_rating INTEGER,
      objective_met INTEGER NOT NULL DEFAULT 0,
      what_worked TEXT NOT NULL DEFAULT '',
      next_focus TEXT NOT NULL DEFAULT '',
      reviewed_by TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_training_sessions_season ON training_sessions(season_id,starts_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_training_periods_session ON training_periods(session_id,sort_order)"),
  ]);
}
