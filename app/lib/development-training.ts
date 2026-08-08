import { bindings } from "./cms";
import { ensureDevelopmentSchema } from "./development";

export type DevelopmentDrill = {
  id: string;
  title: string;
  phase: "indy" | "group" | "team";
  intensity: "low" | "medium" | "high";
  minMinutes: number;
  maxMinutes: number;
  description: string;
  coachingPoints: string;
  skillKeys: string[];
};

const LINEBACKER_DRILLS: DevelopmentDrill[] = [
  { id: "lb-angle-tackle", title: "Angle Tackling Circuit", phase: "indy", intensity: "medium", minMinutes: 8, maxMinutes: 15, description: "Open-field leverage, breakdown and finish from changing pursuit angles.", coachingPoints: "Inside-out leverage · near foot/near shoulder · eyes through target · wrap and finish", skillKeys: ["lb_tackling_form", "lb_open_field_tackling", "lb_pursuit_angles"] },
  { id: "lb-fit-and-finish", title: "Fit & Finish Run Drill", phase: "group", intensity: "high", minMinutes: 10, maxMinutes: 18, description: "Run-fit execution versus coached blocking surfaces with live finish rules.", coachingPoints: "Key the guard · fit correct gap · maintain leverage · finish square", skillKeys: ["lb_run_fit", "lb_gap_integrity", "lb_key_reads"] },
  { id: "lb-strike-separate", title: "Strike-Separate-Escape", phase: "indy", intensity: "high", minMinutes: 8, maxMinutes: 14, description: "Second-level block destruction with hand placement and controlled escape.", coachingPoints: "Violent hands · extension · keep shoulders square · escape to leverage", skillKeys: ["lb_block_destruction", "lb_physicality"] },
  { id: "lb-read-react", title: "Read & React Recognition", phase: "group", intensity: "medium", minMinutes: 10, maxMinutes: 18, description: "Fast recognition of run/pass keys, screens, play-action and backfield flow.", coachingPoints: "Eyes on keys · first two steps disciplined · communicate picture · trigger decisively", skillKeys: ["lb_key_reads", "lb_play_recognition", "lb_assignment_execution"] },
  { id: "lb-zone-match", title: "Zone Drop & Route Match", phase: "group", intensity: "medium", minMinutes: 10, maxMinutes: 18, description: "Landmark drops, route distribution and break-on-ball from linebacker zones.", coachingPoints: "Depth before width · vision through QB · match threats · close throwing windows", skillKeys: ["lb_zone_drops", "lb_football_awareness"] },
  { id: "lb-back-match", title: "RB/TE Match Coverage", phase: "indy", intensity: "medium", minMinutes: 8, maxMinutes: 15, description: "Man leverage and transition technique versus backs and tight ends.", coachingPoints: "Win leverage · patient hips · stay square · finish through hands", skillKeys: ["lb_man_coverage", "lb_change_direction", "lb_footwork"] },
  { id: "lb-pressure-path", title: "Pressure Path & Finish", phase: "group", intensity: "high", minMinutes: 8, maxMinutes: 15, description: "Blitz timing, disguise, protection attack and controlled quarterback finish.", coachingPoints: "Time cadence · disguise until trigger · attack half-man · flatten to QB", skillKeys: ["lb_blitz_timing", "lb_pass_rush_finish"] },
  { id: "lb-pre-snap-command", title: "Pre-Snap Command Period", phase: "group", intensity: "low", minMinutes: 6, maxMinutes: 12, description: "Formation recognition, motion adjustment and defensive communication under time pressure.", coachingPoints: "Identify strength early · echo call · react to motion · reset alignment fast", skillKeys: ["lb_communication", "lb_football_awareness", "lb_assignment_execution"] },
  { id: "lb-footwork-box", title: "Read-Step & Redirect Box", phase: "indy", intensity: "medium", minMinutes: 8, maxMinutes: 14, description: "Read step, shuffle, crossover and controlled redirect without false steps.", coachingPoints: "Quiet upper body · efficient first step · hips underneath · accelerate out", skillKeys: ["lb_footwork", "lb_change_direction"] },
  { id: "lb-pursuit-tempo", title: "Pursuit Tempo Team Drill", phase: "team", intensity: "high", minMinutes: 10, maxMinutes: 18, description: "Full-front pursuit with force/spill/cutback integrity and rally finish.", coachingPoints: "Know leverage role · maintain spacing · no overrun · all eleven finish", skillKeys: ["lb_pursuit_angles", "lb_gap_integrity", "lb_motor"] },
  { id: "lb-situational-iq", title: "Situational IQ Period", phase: "group", intensity: "low", minMinutes: 8, maxMinutes: 15, description: "Down-distance, field zone and clock situations with offensive tendency prompts.", coachingPoints: "State situation before snap · anticipate concept family · communicate alert · execute call", skillKeys: ["lb_football_awareness", "lb_play_recognition", "lb_communication"] },
  { id: "lb-repeat-effort", title: "Repeat-Effort LB Finish", phase: "indy", intensity: "high", minMinutes: 8, maxMinutes: 15, description: "Short football-specific repeat efforts while preserving footwork and assignment quality.", coachingPoints: "Technique under fatigue · fast recovery · finish every rep · no mental drop-off", skillKeys: ["lb_conditioning", "lb_motor", "lb_footwork"] },
];

export async function ensureDevelopmentTrainingSchema() {
  await ensureDevelopmentSchema();
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS development_drills (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      position_group TEXT NOT NULL DEFAULT 'LB',
      phase TEXT NOT NULL DEFAULT 'indy',
      intensity TEXT NOT NULL DEFAULT 'medium',
      min_minutes INTEGER NOT NULL DEFAULT 8,
      max_minutes INTEGER NOT NULL DEFAULT 15,
      description TEXT NOT NULL DEFAULT '',
      coaching_points TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS development_skill_drills (
      skill_key TEXT NOT NULL,
      drill_id TEXT NOT NULL,
      relevance INTEGER NOT NULL DEFAULT 100,
      PRIMARY KEY (skill_key, drill_id)
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS development_goal_progress (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      progress_pct INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      recorded_by TEXT NOT NULL DEFAULT '',
      recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON development_goal_progress(goal_id,recorded_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_skill_drills_skill ON development_skill_drills(skill_key,relevance)"),
  ]);

  await DB.batch(LINEBACKER_DRILLS.map((drill) => DB.prepare(`INSERT INTO development_drills
    (id,title,position_group,phase,intensity,min_minutes,max_minutes,description,coaching_points,active,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,position_group=excluded.position_group,phase=excluded.phase,intensity=excluded.intensity,
      min_minutes=excluded.min_minutes,max_minutes=excluded.max_minutes,description=excluded.description,coaching_points=excluded.coaching_points,active=1,updated_at=CURRENT_TIMESTAMP`)
    .bind(drill.id, drill.title, "LB", drill.phase, drill.intensity, drill.minMinutes, drill.maxMinutes, drill.description, drill.coachingPoints)));

  const linkStatements = LINEBACKER_DRILLS.flatMap((drill) => drill.skillKeys.map((skillKey, index) => DB.prepare(`INSERT INTO development_skill_drills (skill_key,drill_id,relevance)
    VALUES (?,?,?) ON CONFLICT(skill_key,drill_id) DO UPDATE SET relevance=excluded.relevance`)
    .bind(skillKey, drill.id, Math.max(70, 100 - index * 10))));
  if (linkStatements.length) await DB.batch(linkStatements);
}

export function getSeededLinebackerDrills() {
  return LINEBACKER_DRILLS;
}
