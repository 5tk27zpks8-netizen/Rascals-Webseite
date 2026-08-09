import { bindings } from "./cms";
import { ensureRosterFoundation } from "./roster";
import { ensurePerformanceSchema } from "./performance";
import { ensureStatsSchema } from "./stats";

export type DevelopmentSkillDefinition = {
  key: string;
  label: string;
  category: string;
  positionGroup: string;
  description: string;
  sortOrder: number;
};

export type DevelopmentGoalStatus = "open" | "in-progress" | "achieved" | "paused";

export const LINEBACKER_POSITIONS = ["LB", "MLB", "ILB", "OLB", "WILL", "MIKE", "SAM"] as const;

const LINEBACKER_SKILLS: DevelopmentSkillDefinition[] = [
  { key: "lb_tackling_form", label: "Tackling Form", category: "Fundamentals", positionGroup: "LB", description: "Pad level, leverage, head placement, wrap and finish.", sortOrder: 10 },
  { key: "lb_open_field_tackling", label: "Open Field Tackling", category: "Fundamentals", positionGroup: "LB", description: "Breakdown, leverage and finish in space against ball carriers.", sortOrder: 20 },
  { key: "lb_pursuit_angles", label: "Pursuit Angles", category: "Run Defense", positionGroup: "LB", description: "Inside-out pursuit, cutback control and rally-to-the-ball discipline.", sortOrder: 30 },
  { key: "lb_block_destruction", label: "Block Destruction", category: "Run Defense", positionGroup: "LB", description: "Strike, extension, separation and escape against second-level blocks.", sortOrder: 40 },
  { key: "lb_run_fit", label: "Run Fit", category: "Run Defense", positionGroup: "LB", description: "Fit assigned gap correctly relative to front, force and spill rules.", sortOrder: 50 },
  { key: "lb_gap_integrity", label: "Gap Integrity", category: "Run Defense", positionGroup: "LB", description: "Maintain responsibility, leverage and cutback discipline through the rep.", sortOrder: 60 },
  { key: "lb_key_reads", label: "Key Reads", category: "Football IQ", positionGroup: "LB", description: "Read guard, backfield and formation keys quickly and consistently.", sortOrder: 70 },
  { key: "lb_play_recognition", label: "Play Recognition", category: "Football IQ", positionGroup: "LB", description: "Recognize run/pass concepts, screens, play-action and tendencies early.", sortOrder: 80 },
  { key: "lb_assignment_execution", label: "Assignment Execution", category: "Football IQ", positionGroup: "LB", description: "Know and execute responsibility for call, formation and situation.", sortOrder: 90 },
  { key: "lb_zone_drops", label: "Zone Drops", category: "Coverage", positionGroup: "LB", description: "Landmark, spacing, eyes, route distribution and break on the football.", sortOrder: 100 },
  { key: "lb_man_coverage", label: "Man Coverage", category: "Coverage", positionGroup: "LB", description: "Leverage, hip position and matchup technique versus backs and tight ends.", sortOrder: 110 },
  { key: "lb_blitz_timing", label: "Blitz Timing", category: "Pressure", positionGroup: "LB", description: "Cadence, disguise, path and timing without compromising assignment integrity.", sortOrder: 120 },
  { key: "lb_pass_rush_finish", label: "Pass Rush Finish", category: "Pressure", positionGroup: "LB", description: "Close space, defeat protection and finish pressures under control.", sortOrder: 130 },
  { key: "lb_communication", label: "Communication", category: "Leadership", positionGroup: "LB", description: "Make fast, clear pre-snap and post-motion calls across the defense.", sortOrder: 140 },
  { key: "lb_football_awareness", label: "Situational Awareness", category: "Mental", positionGroup: "LB", description: "Down-distance, clock, field zone and offensive tendency awareness.", sortOrder: 150 },
  { key: "lb_footwork", label: "Linebacker Footwork", category: "Athletic", positionGroup: "LB", description: "Read step, shuffle, crossover, redirect and body control.", sortOrder: 160 },
  { key: "lb_change_direction", label: "Change of Direction", category: "Athletic", positionGroup: "LB", description: "Efficient deceleration, hip transition and re-acceleration.", sortOrder: 170 },
  { key: "lb_physicality", label: "Physicality", category: "Athletic", positionGroup: "LB", description: "Play strength, contact confidence and ability to impose leverage.", sortOrder: 180 },
  { key: "lb_motor", label: "Motor / Effort", category: "Mental", positionGroup: "LB", description: "Effort, pursuit and competitive finish from snap to whistle.", sortOrder: 190 },
  { key: "lb_conditioning", label: "Football Conditioning", category: "Athletic", positionGroup: "LB", description: "Repeat high-intensity linebacker reps without meaningful execution drop-off.", sortOrder: 200 },
];

async function tableExists(table: string) {
  const { DB } = bindings();
  const row = await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").bind(table).first<{ name: string }>();
  return Boolean(row?.name);
}

async function tableColumns(table: string) {
  const { DB } = bindings();
  if (!(await tableExists(table))) return new Set<string>();
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all<Record<string, unknown>>();
  return new Set(info.results.map((row) => String(row.name)));
}

async function migrateLegacyDevelopmentSkills() {
  const { DB } = bindings();
  if (!(await tableExists("player_development_skills"))) return;

  const legacyColumns = await tableColumns("player_development_skills");
  if (!legacyColumns.has("season_id")) {
    await DB.prepare("ALTER TABLE player_development_skills ADD COLUMN season_id TEXT").run();
  }

  await DB.prepare(`UPDATE player_development_skills
    SET season_id=(SELECT id FROM seasons WHERE is_current=1 ORDER BY year DESC LIMIT 1)
    WHERE season_id IS NULL OR season_id=''`).run();

  await DB.prepare(`INSERT INTO player_skill_evaluations
    (id,player_id,season_id,skill_key,current_rating,target_rating,priority,confidence,note,context,evaluated_at,evaluated_by,created_at)
    SELECT 'legacy-' || player_id || '-' || skill_key || '-' || COALESCE(season_id,''),
      player_id,season_id,skill_key,current_rating,target_rating,priority,2,note,'legacy-migration',updated_at,updated_by,updated_at
    FROM player_development_skills legacy
    WHERE season_id IS NOT NULL AND season_id<>''
      AND NOT EXISTS (
        SELECT 1 FROM player_skill_evaluations current
        WHERE current.id='legacy-' || legacy.player_id || '-' || legacy.skill_key || '-' || COALESCE(legacy.season_id,'')
      )`).run();
}

export async function ensureDevelopmentSchema() {
  await ensureRosterFoundation();
  await ensurePerformanceSchema();
  await ensureStatsSchema();
  const { DB } = bindings();

  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS development_skill_definitions (
      skill_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      category TEXT NOT NULL,
      position_group TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS player_skill_evaluations (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      skill_key TEXT NOT NULL,
      current_rating REAL NOT NULL,
      target_rating REAL NOT NULL,
      priority INTEGER NOT NULL DEFAULT 2,
      confidence INTEGER NOT NULL DEFAULT 3,
      note TEXT NOT NULL DEFAULT '',
      context TEXT NOT NULL DEFAULT 'coach-review',
      evaluated_at TEXT NOT NULL,
      evaluated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_skill_eval_player ON player_skill_evaluations(player_id,season_id,skill_key,evaluated_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_skill_eval_group ON player_skill_evaluations(season_id,skill_key,evaluated_at)"),
    DB.prepare(`CREATE TABLE IF NOT EXISTS development_goals (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      skill_key TEXT,
      title TEXT NOT NULL,
      target_rating REAL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_development_goals_player ON development_goals(player_id,season_id,status)"),
  ]);

  await DB.batch(LINEBACKER_SKILLS.map((skill) => DB.prepare(`INSERT INTO development_skill_definitions
    (skill_key,label,category,position_group,description,sort_order,active)
    VALUES (?,?,?,?,?,?,1)
    ON CONFLICT(skill_key) DO UPDATE SET label=excluded.label,category=excluded.category,position_group=excluded.position_group,
      description=excluded.description,sort_order=excluded.sort_order,active=1,updated_at=CURRENT_TIMESTAMP`)
    .bind(skill.key, skill.label, skill.category, skill.positionGroup, skill.description, skill.sortOrder)));

  await migrateLegacyDevelopmentSkills();
}

export function developmentNeedScore(current: number, target: number, priority: number) {
  const gap = Math.max(0, target - current);
  const normalizedGap = Math.min(1, gap / 4);
  const priorityWeight = Math.max(1, Math.min(3, priority)) / 3;
  return Math.round(normalizedGap * priorityWeight * 100);
}

export function getLinebackerSkillDefinitions() {
  return LINEBACKER_SKILLS;
}
