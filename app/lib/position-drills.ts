import { bindings } from "./cms";
import { ensurePositionDevelopmentSchema, type PositionGroupKey } from "./position-development";

export type PositionDrillSeed = {
  id: string;
  title: string;
  group: PositionGroupKey;
  phase: "indy" | "group" | "team";
  intensity: "low" | "medium" | "high";
  minMinutes: number;
  maxMinutes: number;
  description: string;
  coachingPoints: string;
  skillKeys: string[];
};

const POSITION_DRILLS: PositionDrillSeed[] = [
  { id: "qb-rhythm-progression", title: "Rhythm Progression Period", group: "QB", phase: "indy", intensity: "medium", minMinutes: 10, maxMinutes: 18, description: "Scripted drop, hitch and progression work with route landmarks and timed answers.", coachingPoints: "Base under hips · eyes lead feet · throw on rhythm · reset efficiently", skillKeys: ["qb_footwork", "qb_timing", "qb_progressions", "qb_accuracy"] },
  { id: "qb-pressure-decision", title: "Pressure Decision Circuit", group: "QB", phase: "group", intensity: "high", minMinutes: 10, maxMinutes: 18, description: "Simulated pressure pictures with protection answers, hot throws and pocket movement.", coachingPoints: "Identify pressure pre-snap · protect football · decisive answer · no late throws", skillKeys: ["qb_pressure", "qb_decision", "qb_ball_security", "qb_command"] },

  { id: "rb-press-cut", title: "Press-Cut Vision Circuit", group: "RB", phase: "indy", intensity: "medium", minMinutes: 8, maxMinutes: 15, description: "Backs press landmarks against moving leverage pictures before decisive cuts.", coachingPoints: "Press track · read leverage · one decisive cut · accelerate vertical", skillKeys: ["rb_vision", "rb_press_cut", "rb_contact_balance"] },
  { id: "rb-protection-release", title: "Protection to Release", group: "RB", phase: "group", intensity: "high", minMinutes: 10, maxMinutes: 16, description: "Scan protection responsibility before releasing into route assignments.", coachingPoints: "Identify threat · square contact · secure inside-out · release on time", skillKeys: ["rb_pass_pro", "rb_assignment", "rb_route", "rb_ball_security"] },

  { id: "wr-release-stack", title: "Release & Stack Circuit", group: "WRTE", phase: "indy", intensity: "medium", minMinutes: 10, maxMinutes: 16, description: "Press releases into vertical stack and breakpoint separation.", coachingPoints: "Attack leverage · efficient feet · regain vertical lane · violent breakpoint", skillKeys: ["wr_release", "wr_stem", "wr_breaks", "wr_separation"] },
  { id: "wr-catch-yac", title: "Catch-to-YAC Transition", group: "WRTE", phase: "group", intensity: "medium", minMinutes: 8, maxMinutes: 15, description: "Catch variations followed immediately by leverage-based YAC decisions.", coachingPoints: "Eyes through catch · secure first · transition shoulders · get vertical", skillKeys: ["wr_catch", "wr_yac", "wr_adjustments"] },

  { id: "ol-first-two", title: "First Two Steps & Fit", group: "OL", phase: "indy", intensity: "medium", minMinutes: 10, maxMinutes: 18, description: "Stance, first two steps, hand fit and leverage by run scheme.", coachingPoints: "No false step · pad level · inside hands · hips through contact", skillKeys: ["ol_stance_start", "ol_hand_placement", "ol_leverage", "ol_run_fit"] },
  { id: "ol-set-anchor", title: "Set-Anchor-Redirect", group: "OL", phase: "group", intensity: "high", minMinutes: 10, maxMinutes: 18, description: "Pass-set relationships against speed, power and counter rushes.", coachingPoints: "Protect inside · independent hands · sink anchor · recover without crossing feet", skillKeys: ["ol_pass_set", "ol_anchor", "ol_twists", "ol_finish"] },

  { id: "dl-getoff-hands", title: "Get-Off & Hands Circuit", group: "DL", phase: "indy", intensity: "high", minMinutes: 8, maxMinutes: 15, description: "Reaction get-off into strike, separation and finish mechanics.", coachingPoints: "Key movement · first step vertical · violent accurate hands · hips through", skillKeys: ["dl_getoff", "dl_hands", "dl_shed"] },
  { id: "dl-read-rush", title: "Block Read to Rush Plan", group: "DL", phase: "group", intensity: "high", minMinutes: 10, maxMinutes: 18, description: "Recognition of run/pass surfaces followed by correct gap or rush response.", coachingPoints: "Read near triangle · own gap first · rush with plan · counter on blocker response", skillKeys: ["dl_block_recognition", "dl_gap_control", "dl_pass_rush", "dl_stunts", "dl_pursuit"] },

  { id: "db-transition-leverage", title: "Transition & Leverage Circuit", group: "DB", phase: "indy", intensity: "medium", minMinutes: 10, maxMinutes: 16, description: "Pedal, weave and transition work connected to man leverage rules.", coachingPoints: "Stay square · leverage first · no wasted steps · accelerate out of transition", skillKeys: ["db_stance", "db_man_leverage", "db_open_field_tackle"] },
  { id: "db-route-ball", title: "Route Recognition to Ball", group: "DB", phase: "group", intensity: "medium", minMinutes: 10, maxMinutes: 18, description: "Pattern distribution and route recognition ending with catch-point finish.", coachingPoints: "Formation clue · eyes through threats · communicate switch · finish football", skillKeys: ["db_zone_spacing", "db_route_recognition", "db_ball_skills", "db_communication", "db_run_support"] },

  { id: "st-operation", title: "Special Teams Operation Period", group: "ST", phase: "group", intensity: "medium", minMinutes: 10, maxMinutes: 20, description: "Role-specific operation timing for snap, hold, kick, punt and return decisions.", coachingPoints: "Repeatable setup · operation time · placement · finish assignment", skillKeys: ["st_operation", "st_accuracy", "st_hang_distance", "st_assignment"] },
  { id: "st-lane-finish", title: "Lane Integrity & Finish", group: "ST", phase: "team", intensity: "high", minMinutes: 10, maxMinutes: 18, description: "Coverage lanes, return leverage and open-field finish at controlled team tempo.", coachingPoints: "Own lane · leverage returner · avoid overrun · secure finish", skillKeys: ["st_coverage_lane", "st_open_field", "st_return_decision", "st_pressure"] },
];

export async function ensurePositionDrills() {
  await ensurePositionDevelopmentSchema();
  const { DB } = bindings();
  await DB.batch(POSITION_DRILLS.map((drill) => DB.prepare(`INSERT INTO development_drills
    (id,title,position_group,phase,intensity,min_minutes,max_minutes,description,coaching_points,active,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,position_group=excluded.position_group,phase=excluded.phase,intensity=excluded.intensity,
      min_minutes=excluded.min_minutes,max_minutes=excluded.max_minutes,description=excluded.description,coaching_points=excluded.coaching_points,active=1,updated_at=CURRENT_TIMESTAMP`)
    .bind(drill.id, drill.title, drill.group, drill.phase, drill.intensity, drill.minMinutes, drill.maxMinutes, drill.description, drill.coachingPoints)));

  const links = POSITION_DRILLS.flatMap((drill) => drill.skillKeys.map((skillKey, index) => DB.prepare(`INSERT INTO development_skill_drills (skill_key,drill_id,relevance)
    VALUES (?,?,?) ON CONFLICT(skill_key,drill_id) DO UPDATE SET relevance=excluded.relevance`)
    .bind(skillKey, drill.id, Math.max(70, 100 - index * 10))));
  if (links.length) await DB.batch(links);
}

export function getSeededPositionDrills() {
  return POSITION_DRILLS;
}
