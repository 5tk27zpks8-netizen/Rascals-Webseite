import { bindings } from "./cms";

export type PlaybookUnit = "offense" | "defense" | "special-teams";
export type PlayStatus = "draft" | "published" | "archived";
export type AssignmentVisual = "stationary" | "route" | "motion" | "block" | "blitz" | "fit" | "zone" | "man";

export async function ensurePlaybookFoundationSchema() {
  const { DB } = bindings();

  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_formations (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      unit TEXT NOT NULL,
      name TEXT NOT NULL,
      personnel TEXT NOT NULL DEFAULT '',
      family TEXT NOT NULL DEFAULT '',
      strength_rule TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_playbook_formations_season_unit ON playbook_formations(season_id, unit, active)`),

    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_formation_slots (
      id TEXT PRIMARY KEY,
      formation_id TEXT NOT NULL,
      slot_key TEXT NOT NULL,
      position_label TEXT NOT NULL,
      position_group TEXT NOT NULL DEFAULT '',
      role_label TEXT NOT NULL DEFAULT '',
      x REAL NOT NULL DEFAULT 50,
      y REAL NOT NULL DEFAULT 50,
      eligible_positions TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(formation_id, slot_key)
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_playbook_slots_formation ON playbook_formation_slots(formation_id, sort_order)`),

    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_plays (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      formation_id TEXT,
      unit TEXT NOT NULL,
      name TEXT NOT NULL,
      call_name TEXT NOT NULL DEFAULT '',
      concept TEXT NOT NULL DEFAULT '',
      play_type TEXT NOT NULL DEFAULT '',
      personnel TEXT NOT NULL DEFAULT '',
      situation TEXT NOT NULL DEFAULT '',
      down_distance TEXT NOT NULL DEFAULT '',
      field_zone TEXT NOT NULL DEFAULT '',
      hash TEXT NOT NULL DEFAULT '',
      strength_call TEXT NOT NULL DEFAULT '',
      front_call TEXT NOT NULL DEFAULT '',
      coverage_call TEXT NOT NULL DEFAULT '',
      checks_alerts TEXT NOT NULL DEFAULT '',
      objective TEXT NOT NULL DEFAULT '',
      coaching_points TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_playbook_plays_season_unit ON playbook_plays(season_id, unit, status)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_playbook_plays_formation ON playbook_plays(formation_id)`),

    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_assignments (
      id TEXT PRIMARY KEY,
      play_id TEXT NOT NULL,
      formation_slot_id TEXT,
      slot_key TEXT NOT NULL DEFAULT '',
      position_label TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      assignment TEXT NOT NULL DEFAULT '',
      key_read TEXT NOT NULL DEFAULT '',
      technique TEXT NOT NULL DEFAULT '',
      coaching_point TEXT NOT NULL DEFAULT '',
      visual_type TEXT NOT NULL DEFAULT 'stationary',
      x REAL NOT NULL DEFAULT 50,
      y REAL NOT NULL DEFAULT 50,
      end_x REAL,
      end_y REAL,
      path_json TEXT NOT NULL DEFAULT '[]',
      pre_snap_path_json TEXT NOT NULL DEFAULT '[]',
      zone_width REAL NOT NULL DEFAULT 12,
      zone_height REAL NOT NULL DEFAULT 12,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_playbook_assignments_play ON playbook_assignments(play_id, sort_order)`),

    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_versions (
      id TEXT PRIMARY KEY,
      play_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      snapshot_json TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(play_id, version)
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_playbook_versions_play ON playbook_versions(play_id, version DESC)`),

    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_gameplans (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      game_id TEXT,
      unit TEXT NOT NULL,
      name TEXT NOT NULL,
      opponent TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_playbook_gameplans_season_game ON playbook_gameplans(season_id, game_id, unit)`),

    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_gameplan_plays (
      id TEXT PRIMARY KEY,
      gameplan_id TEXT NOT NULL,
      play_id TEXT NOT NULL,
      section TEXT NOT NULL DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 0,
      call_order INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(gameplan_id, play_id, section)
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_playbook_gameplan_plays_plan ON playbook_gameplan_plays(gameplan_id, section, call_order)`)
  ]);
}

export function normalizePlaybookUnit(value: unknown): PlaybookUnit {
  const unit = String(value ?? "offense");
  return unit === "defense" || unit === "special-teams" ? unit : "offense";
}

export function normalizePlayStatus(value: unknown): PlayStatus {
  const status = String(value ?? "draft");
  return status === "published" || status === "archived" ? status : "draft";
}
