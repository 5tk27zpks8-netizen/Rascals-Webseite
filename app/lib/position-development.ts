import { bindings } from "./cms";
import { ensureDevelopmentSchema, developmentNeedScore, type DevelopmentSkillDefinition } from "./development";
import { ensureDevelopmentTrainingSchema } from "./development-training";

export type PositionGroupKey = "QB" | "RB" | "WRTE" | "OL" | "DL" | "LB" | "DB" | "ST";

export type PositionGroupDefinition = {
  key: PositionGroupKey;
  label: string;
  unit: "offense" | "defense" | "special-teams";
  aliases: string[];
  statKeys: string[];
};

export const POSITION_GROUPS: PositionGroupDefinition[] = [
  { key: "QB", label: "Quarterbacks", unit: "offense", aliases: ["QB"], statKeys: ["pass_attempts", "pass_completions", "passing_yards", "passing_td", "interceptions_thrown", "carries", "rushing_yards", "rushing_td"] },
  { key: "RB", label: "Running Backs", unit: "offense", aliases: ["RB", "HB", "FB"], statKeys: ["carries", "rushing_yards", "rushing_td", "targets", "receptions", "receiving_yards", "receiving_td", "yac", "drops"] },
  { key: "WRTE", label: "Receivers & Tight Ends", unit: "offense", aliases: ["WR", "TE", "X", "Z", "SLOT"], statKeys: ["targets", "receptions", "receiving_yards", "receiving_td", "yac", "drops"] },
  { key: "OL", label: "Offensive Line", unit: "offense", aliases: ["OL", "LT", "LG", "C", "RG", "RT", "G", "T"], statKeys: [] },
  { key: "DL", label: "Defensive Line", unit: "defense", aliases: ["DL", "DE", "DT", "NT", "EDGE"], statKeys: ["tackles", "tackles_solo", "tackles_assisted", "tfl", "sacks", "qb_hits", "forced_fumbles", "fumble_recoveries"] },
  { key: "LB", label: "Linebackers", unit: "defense", aliases: ["LB", "MLB", "ILB", "OLB", "WILL", "MIKE", "SAM"], statKeys: ["tackles", "tackles_solo", "tackles_assisted", "tfl", "sacks", "qb_hits", "interceptions", "pass_breakups", "forced_fumbles", "fumble_recoveries", "coverage_tackles"] },
  { key: "DB", label: "Defensive Backs", unit: "defense", aliases: ["DB", "CB", "FS", "SS", "S", "NB", "NICKEL"], statKeys: ["tackles", "tackles_solo", "tackles_assisted", "interceptions", "pass_breakups", "forced_fumbles", "fumble_recoveries", "coverage_tackles"] },
  { key: "ST", label: "Special Teams", unit: "special-teams", aliases: ["K", "P", "LS", "KR", "PR", "ST"], statKeys: ["field_goals_made", "field_goals_attempted", "pat_made", "punts", "punt_yards", "kick_return_yards", "punt_return_yards", "coverage_tackles", "blocked_kicks"] },
];

const SKILLS: DevelopmentSkillDefinition[] = [
  { key: "qb_footwork", label: "Drop & Pocket Footwork", category: "Fundamentals", positionGroup: "QB", description: "Drop mechanics, base, reset and movement while keeping the throwing platform ready.", sortOrder: 10 },
  { key: "qb_accuracy", label: "Accuracy", category: "Passing", positionGroup: "QB", description: "Ball placement by concept, leverage and field zone.", sortOrder: 20 },
  { key: "qb_timing", label: "Timing & Anticipation", category: "Passing", positionGroup: "QB", description: "Deliver on rhythm and throw receivers open before the break.", sortOrder: 30 },
  { key: "qb_progressions", label: "Progression Speed", category: "Football IQ", positionGroup: "QB", description: "Move through reads with correct eyes, feet and timing.", sortOrder: 40 },
  { key: "qb_pressure", label: "Pressure Management", category: "Pocket", positionGroup: "QB", description: "Identify pressure, protect the football and create efficient answers.", sortOrder: 50 },
  { key: "qb_decision", label: "Decision Quality", category: "Football IQ", positionGroup: "QB", description: "Choose the correct answer relative to coverage, leverage and situation.", sortOrder: 60 },
  { key: "qb_ball_security", label: "Ball Security", category: "Fundamentals", positionGroup: "QB", description: "Protect the football through exchanges, movement and contact.", sortOrder: 70 },
  { key: "qb_command", label: "Huddle / Pre-Snap Command", category: "Leadership", positionGroup: "QB", description: "Communicate formation, motion, checks and cadence clearly.", sortOrder: 80 },

  { key: "rb_vision", label: "Run Vision", category: "Run Game", positionGroup: "RB", description: "Read leverage, tracks and cutback lanes without unnecessary hesitation.", sortOrder: 10 },
  { key: "rb_press_cut", label: "Press & Cut", category: "Run Game", positionGroup: "RB", description: "Press landmark, influence defenders and make decisive one-cut decisions.", sortOrder: 20 },
  { key: "rb_ball_security", label: "Ball Security", category: "Fundamentals", positionGroup: "RB", description: "Maintain five points of pressure through traffic and contact.", sortOrder: 30 },
  { key: "rb_contact_balance", label: "Contact Balance", category: "Athletic", positionGroup: "RB", description: "Stay productive through glancing contact and finish runs.", sortOrder: 40 },
  { key: "rb_pass_pro", label: "Pass Protection", category: "Protection", positionGroup: "RB", description: "Identify responsibility, square pressure and anchor with proper leverage.", sortOrder: 50 },
  { key: "rb_route", label: "Route Execution", category: "Passing Game", positionGroup: "RB", description: "Release, stem, separation and timing from the backfield.", sortOrder: 60 },
  { key: "rb_yac", label: "YAC Ability", category: "Passing Game", positionGroup: "RB", description: "Transition quickly after catch and maximize space with efficient decisions.", sortOrder: 70 },
  { key: "rb_assignment", label: "Assignment Reliability", category: "Football IQ", positionGroup: "RB", description: "Execute run, protection and route responsibility correctly.", sortOrder: 80 },

  { key: "wr_release", label: "Release Package", category: "Route Craft", positionGroup: "WRTE", description: "Win access and leverage against press and off coverage.", sortOrder: 10 },
  { key: "wr_stem", label: "Stem & Leverage", category: "Route Craft", positionGroup: "WRTE", description: "Use stem to manipulate leverage and create space for the break.", sortOrder: 20 },
  { key: "wr_breaks", label: "Break Efficiency", category: "Route Craft", positionGroup: "WRTE", description: "Enter and exit cuts with speed, body control and consistent depth.", sortOrder: 30 },
  { key: "wr_catch", label: "Catch Technique", category: "Ball Skills", positionGroup: "WRTE", description: "Hands, tracking and finish through contact across catch types.", sortOrder: 40 },
  { key: "wr_separation", label: "Separation", category: "Route Craft", positionGroup: "WRTE", description: "Create usable throwing windows versus man and zone structures.", sortOrder: 50 },
  { key: "wr_yac", label: "YAC", category: "Ball Skills", positionGroup: "WRTE", description: "Transition after catch and make efficient open-field decisions.", sortOrder: 60 },
  { key: "wr_blocking", label: "Perimeter Blocking", category: "Run Game", positionGroup: "WRTE", description: "Fit leverage, sustain position and finish without penalties.", sortOrder: 70 },
  { key: "wr_adjustments", label: "Coverage Adjustments", category: "Football IQ", positionGroup: "WRTE", description: "Recognize coverage and execute option/spacing rules correctly.", sortOrder: 80 },

  { key: "ol_stance_start", label: "Stance & Start", category: "Fundamentals", positionGroup: "OL", description: "Consistent stance, first two steps and pad level by scheme.", sortOrder: 10 },
  { key: "ol_hand_placement", label: "Hand Placement", category: "Technique", positionGroup: "OL", description: "Win inside hand position and re-fit under pressure.", sortOrder: 20 },
  { key: "ol_leverage", label: "Leverage & Pad Level", category: "Technique", positionGroup: "OL", description: "Play under defenders while maintaining balance and power.", sortOrder: 30 },
  { key: "ol_run_fit", label: "Run Fit / Combo", category: "Run Game", positionGroup: "OL", description: "Fit correctly, generate movement and transition combinations on time.", sortOrder: 40 },
  { key: "ol_pass_set", label: "Pass Set", category: "Pass Protection", positionGroup: "OL", description: "Set depth, angle and relationship to protect the pocket.", sortOrder: 50 },
  { key: "ol_anchor", label: "Anchor", category: "Pass Protection", positionGroup: "OL", description: "Stop power without losing width, posture or pocket integrity.", sortOrder: 60 },
  { key: "ol_twists", label: "Twist / Pressure Pickup", category: "Football IQ", positionGroup: "OL", description: "Communicate and pass off games and pressures cleanly.", sortOrder: 70 },
  { key: "ol_finish", label: "Finish & Discipline", category: "Mental", positionGroup: "OL", description: "Finish legally, avoid holds and sustain effort through the whistle.", sortOrder: 80 },

  { key: "dl_getoff", label: "Get-Off", category: "Fundamentals", positionGroup: "DL", description: "React to movement quickly and gain first-step advantage.", sortOrder: 10 },
  { key: "dl_hands", label: "Hand Violence", category: "Technique", positionGroup: "DL", description: "Strike accurately and control blocker hands and frame.", sortOrder: 20 },
  { key: "dl_block_recognition", label: "Block Recognition", category: "Football IQ", positionGroup: "DL", description: "Identify reach, down, pull, double and pass sets early.", sortOrder: 30 },
  { key: "dl_gap_control", label: "Gap Control", category: "Run Defense", positionGroup: "DL", description: "Maintain assigned gap and leverage without unnecessary displacement.", sortOrder: 40 },
  { key: "dl_shed", label: "Shed & Finish", category: "Run Defense", positionGroup: "DL", description: "Separate from blocks and finish the ball carrier efficiently.", sortOrder: 50 },
  { key: "dl_pass_rush", label: "Pass Rush Plan", category: "Pressure", positionGroup: "DL", description: "Attack protection with a planned move, counter and finish path.", sortOrder: 60 },
  { key: "dl_pursuit", label: "Pursuit", category: "Effort", positionGroup: "DL", description: "Maintain productive pursuit angles and finish away from the initial fit.", sortOrder: 70 },
  { key: "dl_stunts", label: "Stunt Execution", category: "Football IQ", positionGroup: "DL", description: "Execute spacing, timing and communication on games and pressures.", sortOrder: 80 },

  { key: "db_stance", label: "Stance & Transition", category: "Fundamentals", positionGroup: "DB", description: "Efficient pedal, weave, speed turn and transition mechanics.", sortOrder: 10 },
  { key: "db_man_leverage", label: "Man Leverage", category: "Coverage", positionGroup: "DB", description: "Maintain leverage, hip position and route control in man coverage.", sortOrder: 20 },
  { key: "db_zone_spacing", label: "Zone Spacing", category: "Coverage", positionGroup: "DB", description: "Landmark, vision and route distribution within zone structure.", sortOrder: 30 },
  { key: "db_route_recognition", label: "Route Recognition", category: "Football IQ", positionGroup: "DB", description: "Identify route combinations and formation indicators early.", sortOrder: 40 },
  { key: "db_ball_skills", label: "Ball Skills", category: "Ball Skills", positionGroup: "DB", description: "Track, high-point and finish opportunities at the catch point.", sortOrder: 50 },
  { key: "db_open_field_tackle", label: "Open Field Tackling", category: "Run Support", positionGroup: "DB", description: "Control space, leverage and finish safely in the open field.", sortOrder: 60 },
  { key: "db_run_support", label: "Run Support", category: "Run Support", positionGroup: "DB", description: "Trigger, fit and maintain force/cutback responsibility.", sortOrder: 70 },
  { key: "db_communication", label: "Coverage Communication", category: "Leadership", positionGroup: "DB", description: "Identify formations, motions and checks with clear secondary communication.", sortOrder: 80 },

  { key: "st_operation", label: "Operation Consistency", category: "Fundamentals", positionGroup: "ST", description: "Repeatable snap-hold-kick/punt operation or return-unit timing.", sortOrder: 10 },
  { key: "st_accuracy", label: "Accuracy / Placement", category: "Execution", positionGroup: "ST", description: "Control ball placement relative to assignment and field position.", sortOrder: 20 },
  { key: "st_hang_distance", label: "Hang / Distance", category: "Execution", positionGroup: "ST", description: "Produce useful distance and hang-time outcomes for the role.", sortOrder: 30 },
  { key: "st_coverage_lane", label: "Coverage Lane Discipline", category: "Coverage", positionGroup: "ST", description: "Maintain lane integrity, leverage and pursuit relationship.", sortOrder: 40 },
  { key: "st_open_field", label: "Open Field Finish", category: "Coverage", positionGroup: "ST", description: "Break down and finish returners in space.", sortOrder: 50 },
  { key: "st_return_decision", label: "Return Decision", category: "Return", positionGroup: "ST", description: "Secure ball, read leverage and choose efficient return path.", sortOrder: 60 },
  { key: "st_assignment", label: "Assignment Reliability", category: "Football IQ", positionGroup: "ST", description: "Execute role and adjustment across special teams units.", sortOrder: 70 },
  { key: "st_pressure", label: "Pressure / Block Technique", category: "Execution", positionGroup: "ST", description: "Apply legal pressure mechanics on kick and punt block opportunities.", sortOrder: 80 },
];

const CORE_LB_KEYS = new Set([
  "lb_tackling_form", "lb_open_field_tackling", "lb_pursuit_angles", "lb_block_destruction", "lb_run_fit", "lb_gap_integrity",
  "lb_key_reads", "lb_play_recognition", "lb_assignment_execution", "lb_zone_drops", "lb_man_coverage", "lb_blitz_timing",
  "lb_pass_rush_finish", "lb_communication", "lb_football_awareness", "lb_footwork", "lb_change_direction", "lb_physicality", "lb_motor", "lb_conditioning",
]);

export function getPositionGroup(key: string | null | undefined) {
  const normalized = String(key ?? "LB").toUpperCase();
  return POSITION_GROUPS.find((group) => group.key === normalized) ?? POSITION_GROUPS.find((group) => group.key === "LB")!;
}

export function matchesPositionGroup(group: PositionGroupDefinition, primary: string, secondary = "") {
  const values = [primary, secondary].map((value) => value.trim().toUpperCase()).filter(Boolean);
  return values.some((value) => group.aliases.includes(value));
}

export async function ensurePositionDevelopmentSchema() {
  await ensureDevelopmentTrainingSchema();
  const { DB } = bindings();
  const genericSkills = SKILLS.filter((skill) => skill.positionGroup !== "LB" || !CORE_LB_KEYS.has(skill.key));
  if (genericSkills.length) {
    await DB.batch(genericSkills.map((skill) => DB.prepare(`INSERT INTO development_skill_definitions
      (skill_key,label,category,position_group,description,sort_order,active)
      VALUES (?,?,?,?,?,?,1)
      ON CONFLICT(skill_key) DO UPDATE SET label=excluded.label,category=excluded.category,position_group=excluded.position_group,
        description=excluded.description,sort_order=excluded.sort_order,active=1,updated_at=CURRENT_TIMESTAMP`)
      .bind(skill.key, skill.label, skill.category, skill.positionGroup, skill.description, skill.sortOrder)));
  }

  await DB.prepare(`CREATE TABLE IF NOT EXISTS position_development_settings (
    season_id TEXT NOT NULL,
    position_group TEXT NOT NULL,
    target_coverage_pct INTEGER NOT NULL DEFAULT 80,
    review_cadence_days INTEGER NOT NULL DEFAULT 28,
    updated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (season_id, position_group)
  )`).run();
}

export async function getGroupSkills(groupKey: PositionGroupKey) {
  await ensurePositionDevelopmentSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT skill_key,label,category,position_group,description,sort_order
    FROM development_skill_definitions WHERE position_group=? AND active=1 ORDER BY sort_order,skill_key`).bind(groupKey).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    key: String(row.skill_key), label: String(row.label ?? row.skill_key), category: String(row.category ?? ""), positionGroup: String(row.position_group ?? groupKey),
    description: String(row.description ?? ""), sortOrder: Number(row.sort_order ?? 0),
  }));
}

export { developmentNeedScore };
