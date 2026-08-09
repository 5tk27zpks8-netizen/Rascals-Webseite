import { bindings } from "./cms";
import { ensureRosterFoundation } from "./roster";

export type PlaybookUnit = "offense" | "defense" | "special-teams";
export type PlayStatus = "draft" | "published" | "archived";
export type AssignmentVisual = "stationary" | "route" | "motion" | "block" | "blitz" | "fit" | "zone" | "man";

async function ensureColumn(table:string,column:string,ddl:string){
  const {DB}=bindings();
  const info=await DB.prepare(`PRAGMA table_info(${table})`).all<Record<string,unknown>>();
  if(!info.results.some(r=>String(r.name)===column)) await DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${ddl}`).run();
}

export async function ensurePlaybookSchema(){
  await ensureRosterFoundation();
  const {DB}=bindings();

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
      UNIQUE(formation_id,slot_key)
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_plays (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      formation_id TEXT,
      unit TEXT NOT NULL,
      name TEXT NOT NULL,
      concept TEXT NOT NULL DEFAULT '',
      call_name TEXT NOT NULL DEFAULT '',
      play_type TEXT NOT NULL DEFAULT '',
      personnel TEXT NOT NULL DEFAULT '',
      situation TEXT NOT NULL DEFAULT '',
      down_distance TEXT NOT NULL DEFAULT '',
      field_zone TEXT NOT NULL DEFAULT '',
      hash TEXT NOT NULL DEFAULT '',
      objective TEXT NOT NULL DEFAULT '',
      coaching_points TEXT NOT NULL DEFAULT '',
      strength_call TEXT NOT NULL DEFAULT '',
      front_call TEXT NOT NULL DEFAULT '',
      coverage_call TEXT NOT NULL DEFAULT '',
      checks_alerts TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
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
      formation_slot_id TEXT,
      slot_key TEXT NOT NULL DEFAULT '',
      position_label TEXT NOT NULL,
      player_id TEXT,
      role TEXT NOT NULL DEFAULT '',
      assignment TEXT NOT NULL DEFAULT '',
      technique TEXT NOT NULL DEFAULT '',
      key_read TEXT NOT NULL DEFAULT '',
      coaching_point TEXT NOT NULL DEFAULT '',
      x REAL NOT NULL DEFAULT 50,
      y REAL NOT NULL DEFAULT 50,
      end_x REAL,
      end_y REAL,
      visual_type TEXT NOT NULL DEFAULT 'stationary',
      path_json TEXT NOT NULL DEFAULT '[]',
      pre_snap_path_json TEXT NOT NULL DEFAULT '[]',
      zone_width REAL NOT NULL DEFAULT 12,
      zone_height REAL NOT NULL DEFAULT 12,
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
    DB.prepare(`CREATE TABLE IF NOT EXISTS playbook_gameplan_plays (
      id TEXT PRIMARY KEY,
      gameplan_id TEXT NOT NULL,
      play_id TEXT NOT NULL,
      section TEXT NOT NULL DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 0,
      call_order INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_formations_season_unit ON playbook_formations(season_id,unit,active)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_slots_formation ON playbook_formation_slots(formation_id,sort_order)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_plays_season_unit ON playbook_plays(season_id,unit,status)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_plays_formation ON playbook_plays(formation_id)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_assignments_play ON playbook_assignments(play_id,sort_order)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_versions_play ON playbook_versions(play_id,version DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_gameplans_season_game ON playbook_gameplans(season_id,game_id,unit)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_playbook_gameplan_plays_plan ON playbook_gameplan_plays(gameplan_id,section,call_order)")
  ]);

  // Safe migrations for databases created by earlier RASCALS OS playbook revisions.
  await ensureColumn("playbook_formations","family","family TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_formations","strength_rule","strength_rule TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_formations","updated_by","updated_by TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_formations","updated_at","updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");

  await ensureColumn("playbook_plays","play_type","play_type TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","personnel","personnel TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","down_distance","down_distance TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","field_zone","field_zone TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","hash","hash TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","strength_call","strength_call TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","front_call","front_call TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","coverage_call","coverage_call TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","checks_alerts","checks_alerts TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_plays","tags","tags TEXT NOT NULL DEFAULT ''");

  await ensureColumn("playbook_assignments","formation_slot_id","formation_slot_id TEXT");
  await ensureColumn("playbook_assignments","slot_key","slot_key TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_assignments","player_id","player_id TEXT");
  await ensureColumn("playbook_assignments","coaching_point","coaching_point TEXT NOT NULL DEFAULT ''");
  await ensureColumn("playbook_assignments","path_json","path_json TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("playbook_assignments","pre_snap_path_json","pre_snap_path_json TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("playbook_assignments","zone_width","zone_width REAL NOT NULL DEFAULT 12");
  await ensureColumn("playbook_assignments","zone_height","zone_height REAL NOT NULL DEFAULT 12");
}

export function normalizePlaybookUnit(value:unknown):PlaybookUnit{
  const unit=String(value??"offense");
  return unit==="defense"||unit==="special-teams"?unit:"offense";
}

export function normalizePlayStatus(value:unknown):PlayStatus{
  const status=String(value??"draft");
  return status==="published"||status==="archived"?status:"draft";
}
