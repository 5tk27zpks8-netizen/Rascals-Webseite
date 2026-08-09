import { bindings } from "./cms";
import { ensureRosterFoundation } from "./roster";

export type PlaybookUnit = "offense" | "defense" | "special-teams";

export async function ensurePlaybookSchema(){
  await ensureRosterFoundation();
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_formations (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      unit TEXT NOT NULL,
      name TEXT NOT NULL,
      personnel TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_plays (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      formation_id TEXT,
      unit TEXT NOT NULL,
      name TEXT NOT NULL,
      concept TEXT NOT NULL DEFAULT '',
      call_name TEXT NOT NULL DEFAULT '',
      situation TEXT NOT NULL DEFAULT '',
      objective TEXT NOT NULL DEFAULT '',
      coaching_points TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      version INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_assignments (
      id TEXT PRIMARY KEY,
      play_id TEXT NOT NULL,
      position_label TEXT NOT NULL,
      player_id TEXT,
      role TEXT NOT NULL DEFAULT '',
      assignment TEXT NOT NULL DEFAULT '',
      technique TEXT NOT NULL DEFAULT '',
      key_read TEXT NOT NULL DEFAULT '',
      x REAL NOT NULL DEFAULT 50,
      y REAL NOT NULL DEFAULT 50,
      end_x REAL,
      end_y REAL,
      visual_type TEXT NOT NULL DEFAULT 'stationary',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_versions (
      id TEXT PRIMARY KEY,
      play_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_formations_season_unit ON playbook_formations(season_id,unit,active)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_plays_season_unit ON playbook_plays(season_id,unit,status)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_assignments_play ON playbook_assignments(play_id,sort_order)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_versions_play ON playbook_versions(play_id,version)"),
  ]);
}
