import { bindings } from "../../../../../lib/cms";
import { developmentNeedScore, LINEBACKER_POSITIONS } from "../../../../../lib/development";
import { ensureDevelopmentTrainingSchema } from "../../../../../lib/development-training";
import { requireCmsPermission } from "../../../../../lib/permissions";

type Row = Record<string, unknown>;
type Evaluation = {
  id: string; playerId: string; skillKey: string; current: number; target: number; priority: number; confidence: number;
  note: string; evaluatedAt: string; evaluatedBy: string;
};

type ProgressBody = { action?: "goal-progress"; goalId?: string; progressPct?: number; note?: string };

function isLinebacker(position: string) {
  return (LINEBACKER_POSITIONS as readonly string[]).includes(position.trim().toUpperCase());
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function mapEvaluation(row: Row): Evaluation {
  return {
    id: String(row.id), playerId: String(row.player_id), skillKey: String(row.skill_key), current: Number(row.current_rating ?? 0),
    target: Number(row.target_rating ?? 0), priority: Number(row.priority ?? 2), confidence: Number(row.confidence ?? 3), note: String(row.note ?? ""),
    evaluatedAt: String(row.evaluated_at ?? ""), evaluatedBy: String(row.evaluated_by ?? ""),
  };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureDevelopmentTrainingSchema();
  const { DB } = bindings();
  const url = new URL(request.url);
  const requestedMinutes = Number(url.searchParams.get("minutes") ?? 45);
  const focusMinutes = Number.isFinite(requestedMinutes) ? Math.max(20, Math.min(90, Math.round(requestedMinutes))) : 45;

  const seasonsResult = await DB.prepare("SELECT id,year,name,is_current FROM seasons ORDER BY year DESC").all<Row>();
  const seasons = seasonsResult.results.map((row) => ({ id: String(row.id), year: Number(row.year), name: String(row.name ?? ""), isCurrent: Number(row.is_current ?? 0) === 1 }));
  const requestedSeasonId = url.searchParams.get("seasonId");
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons.find((item) => item.isCurrent) ?? seasons[0] ?? null;
  if (!season) return Response.json({ error: "Keine Saison vorhanden." }, { status: 404 });

  const rosterResult = await DB.prepare(`SELECT rm.player_id,rm.jersey_number,rm.primary_position,rm.secondary_position,rm.availability,rm.roster_status,rm.starter,rm.captain,p.first_name,p.last_name
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND rm.roster_status NOT IN ('left','alumni') AND p.active=1
    ORDER BY rm.primary_position,rm.jersey_number,p.last_name`).bind(season.id).all<Row>();
  const players = rosterResult.results.map((row) => ({
    id: String(row.player_id), jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number), firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""),
    position: String(row.primary_position ?? ""), secondaryPosition: String(row.secondary_position ?? ""), availability: String(row.availability ?? "full"),
    rosterStatus: String(row.roster_status ?? "active"), starter: Number(row.starter ?? 0) === 1, captain: Number(row.captain ?? 0) === 1,
  })).filter((player) => isLinebacker(player.position) || isLinebacker(player.secondaryPosition));
  const playerIds = new Set(players.map((player) => player.id));

  const definitionsResult = await DB.prepare("SELECT skill_key,label,category,description,sort_order FROM development_skill_definitions WHERE position_group='LB' AND active=1 ORDER BY sort_order,skill_key").all<Row>();
  const definitions = definitionsResult.results.map((row) => ({ key: String(row.skill_key), label: String(row.label ?? row.skill_key), category: String(row.category ?? ""), description: String(row.description ?? ""), sortOrder: Number(row.sort_order ?? 0) }));

  const evaluationResult = await DB.prepare(`SELECT * FROM player_skill_evaluations WHERE season_id=? ORDER BY evaluated_at DESC,created_at DESC`).bind(season.id).all<Row>();
  const evaluations = evaluationResult.results.map(mapEvaluation).filter((entry) => playerIds.has(entry.playerId));
  const latest = new Map<string, Evaluation>();
  const previous = new Map<string, Evaluation>();
  for (const entry of evaluations) {
    const key = `${entry.playerId}|${entry.skillKey}`;
    if (!latest.has(key)) latest.set(key, entry);
    else if (!previous.has(key)) previous.set(key, entry);
  }

  const drillResult = await DB.prepare(`SELECT l.skill_key,l.relevance,d.id,d.title,d.phase,d.intensity,d.min_minutes,d.max_minutes,d.description,d.coaching_points
    FROM development_skill_drills l JOIN development_drills d ON d.id=l.drill_id
    WHERE d.position_group='LB' AND d.active=1 ORDER BY l.skill_key,l.relevance DESC,d.title`).all<Row>();
  const drillsBySkill = new Map<string, Array<Record<string, unknown>>>();
  for (const row of drillResult.results) {
    const skillKey = String(row.skill_key);
    if (!drillsBySkill.has(skillKey)) drillsBySkill.set(skillKey, []);
    drillsBySkill.get(skillKey)!.push({
      id: String(row.id), title: String(row.title ?? ""), phase: String(row.phase ?? "indy"), intensity: String(row.intensity ?? "medium"),
      minMinutes: Number(row.min_minutes ?? 8), maxMinutes: Number(row.max_minutes ?? 15), description: String(row.description ?? ""), coachingPoints: String(row.coaching_points ?? ""), relevance: Number(row.relevance ?? 100),
    });
  }

  const skillSummaries = definitions.map((definition) => {
    const rows = players.map((player) => latest.get(`${player.id}|${definition.key}`)).filter((entry): entry is Evaluation => Boolean(entry));
    const deltas = rows.map((entry) => {
      const before = previous.get(`${entry.playerId}|${definition.key}`);
      return before ? entry.current - before.current : null;
    }).filter((value): value is number => value != null);
    const current = avg(rows.map((entry) => entry.current));
    const target = avg(rows.map((entry) => entry.target));
    const priority = avg(rows.map((entry) => entry.priority));
    const confidence = avg(rows.map((entry) => entry.confidence));
    const needScore = rows.length ? developmentNeedScore(current, target, priority) : 0;
    const coveragePct = players.length ? Math.round((rows.length / players.length) * 100) : 0;
    const evidenceFactor = Math.min(1, coveragePct / 80) * Math.min(1, confidence / 4);
    const trainingScore = Math.round(needScore * (0.7 + 0.3 * evidenceFactor));
    const status = coveragePct < 40 ? "evaluate-first" : trainingScore >= 50 ? "focus" : trainingScore >= 25 ? "improve" : "maintain";
    return {
      ...definition, count: rows.length, current: round1(current), target: round1(target), priority: round1(priority), confidence: round1(confidence),
      needScore, trainingScore, coveragePct, delta: deltas.length ? round1(avg(deltas)) : null, status,
      drills: (drillsBySkill.get(definition.key) ?? []).slice(0, 3),
    };
  }).sort((a, b) => b.trainingScore - a.trainingScore || b.needScore - a.needScore || a.sortOrder - b.sortOrder);

  const goalsResult = await DB.prepare(`SELECT g.* FROM development_goals g WHERE g.season_id=? ORDER BY CASE g.status WHEN 'in-progress' THEN 0 WHEN 'open' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,COALESCE(g.due_date,'9999-12-31'),g.updated_at DESC`).bind(season.id).all<Row>();
  const goalRows = goalsResult.results.filter((row) => playerIds.has(String(row.player_id)));
  const progressResult = await DB.prepare(`SELECT gp.* FROM development_goal_progress gp JOIN development_goals g ON g.id=gp.goal_id WHERE g.season_id=? ORDER BY gp.recorded_at DESC`).bind(season.id).all<Row>();
  const progressByGoal = new Map<string, Array<{ id: string; progressPct: number; note: string; recordedBy: string; recordedAt: string }>>();
  for (const row of progressResult.results) {
    const goalId = String(row.goal_id);
    if (!progressByGoal.has(goalId)) progressByGoal.set(goalId, []);
    progressByGoal.get(goalId)!.push({ id: String(row.id), progressPct: Number(row.progress_pct ?? 0), note: String(row.note ?? ""), recordedBy: String(row.recorded_by ?? ""), recordedAt: String(row.recorded_at ?? "") });
  }
  const goals = goalRows.map((row) => {
    const history = progressByGoal.get(String(row.id)) ?? [];
    const status = String(row.status ?? "open");
    const fallbackProgress = status === "achieved" ? 100 : 0;
    return {
      id: String(row.id), playerId: String(row.player_id), skillKey: row.skill_key ? String(row.skill_key) : null, title: String(row.title ?? ""), status,
      targetRating: row.target_rating == null ? null : Number(row.target_rating), dueDate: row.due_date ? String(row.due_date) : null, note: String(row.note ?? ""),
      progressPct: history[0]?.progressPct ?? fallbackProgress, progressHistory: history.slice(0, 12), updatedAt: String(row.updated_at ?? ""),
    };
  });

  const playerSummaries = players.map((player) => {
    const rows = definitions.map((definition) => latest.get(`${player.id}|${definition.key}`)).filter((entry): entry is Evaluation => Boolean(entry));
    const needs = rows.map((entry) => developmentNeedScore(entry.current, entry.target, entry.priority));
    const pairedDeltas = rows.map((entry) => {
      const before = previous.get(`${entry.playerId}|${entry.skillKey}`);
      return before ? entry.current - before.current : null;
    }).filter((value): value is number => value != null);
    return {
      ...player,
      evaluated: rows.length,
      coveragePct: definitions.length ? Math.round((rows.length / definitions.length) * 100) : 0,
      currentIndex: rows.length ? Math.round(avg(rows.map((entry) => entry.current)) * 20) : null,
      needIndex: needs.length ? Math.round(avg(needs)) : null,
      trend: pairedDeltas.length ? round1(avg(pairedDeltas)) : null,
      openGoals: goals.filter((goal) => goal.playerId === player.id && goal.status !== "achieved").length,
    };
  }).sort((a, b) => (b.needIndex ?? -1) - (a.needIndex ?? -1));

  const requestedPlayerId = url.searchParams.get("playerId") || "";
  const selectedPlayer = players.find((player) => player.id === requestedPlayerId) ?? players[0] ?? null;
  const selectedSkillTrends = selectedPlayer ? definitions.map((definition) => {
    const history = evaluations.filter((entry) => entry.playerId === selectedPlayer.id && entry.skillKey === definition.key).slice(0, 12).reverse();
    return { key: definition.key, label: definition.label, category: definition.category, history };
  }).filter((item) => item.history.length) : [];
  const selectedGoals = selectedPlayer ? goals.filter((goal) => goal.playerId === selectedPlayer.id) : [];

  const evaluatedSkillSummaries = skillSummaries.filter((skill) => skill.count > 0);
  const pairedRoomDeltas = [...latest.entries()].map(([key, entry]) => {
    const before = previous.get(key);
    return before ? entry.current - before.current : null;
  }).filter((value): value is number => value != null);
  const currentRatings = [...latest.values()].map((entry) => entry.current);
  const overallCoverage = players.length && definitions.length ? Math.round((latest.size / (players.length * definitions.length)) * 100) : 0;
  const roomNeed = evaluatedSkillSummaries.length ? Math.round(avg(evaluatedSkillSummaries.map((skill) => skill.needScore))) : null;
  const roomCurrent = currentRatings.length ? Math.round(avg(currentRatings) * 20) : null;

  const eligible = skillSummaries.filter((skill) => skill.count > 0 && skill.coveragePct >= 40 && skill.trainingScore > 0);
  const focusCount = Math.min(4, Math.max(1, Math.floor(focusMinutes / 10)), eligible.length);
  const focusSkills = eligible.slice(0, focusCount);
  const scoreTotal = focusSkills.reduce((sum, skill) => sum + Math.max(1, skill.trainingScore), 0);
  let allocated = 0;
  const recommendations = focusSkills.map((skill, index) => {
    let minutes = index === focusSkills.length - 1 ? Math.max(0, focusMinutes - allocated) : Math.max(6, Math.round((focusMinutes * Math.max(1, skill.trainingScore)) / Math.max(1, scoreTotal)));
    if (index < focusSkills.length - 1) allocated += minutes;
    if (index === focusSkills.length - 1 && minutes < 6 && focusSkills.length > 1) minutes = 6;
    return { key: skill.key, label: skill.label, category: skill.category, trainingScore: skill.trainingScore, needScore: skill.needScore, coveragePct: skill.coveragePct, minutes, drills: skill.drills.slice(0, 2) };
  });

  const today = new Date().toISOString().slice(0, 10);
  return Response.json({
    current: actor,
    seasons,
    season,
    players,
    selectedPlayer,
    selectedSkillTrends,
    goals: selectedGoals,
    skillSummaries,
    playerSummaries,
    recommendations,
    focusMinutes,
    summary: {
      linebackers: players.length,
      evaluationCoveragePct: overallCoverage,
      currentIndex: roomCurrent,
      needIndex: roomNeed,
      roomTrend: pairedRoomDeltas.length ? round1(avg(pairedRoomDeltas)) : null,
      openGoals: goals.filter((goal) => goal.status !== "achieved").length,
      achievedGoals: goals.filter((goal) => goal.status === "achieved").length,
      overdueGoals: goals.filter((goal) => goal.status !== "achieved" && goal.dueDate && goal.dueDate < today).length,
      averageGoalProgress: goals.length ? Math.round(avg(goals.map((goal) => goal.progressPct))) : null,
    },
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureDevelopmentTrainingSchema();
  const body = await request.json() as ProgressBody;
  if (body.action !== "goal-progress" || !body.goalId) return Response.json({ error: "Ungültige Aktion." }, { status: 400 });
  const progressPct = Math.max(0, Math.min(100, Math.round(Number(body.progressPct ?? 0))));
  if (!Number.isFinite(progressPct)) return Response.json({ error: "Fortschritt muss zwischen 0 und 100 liegen." }, { status: 400 });
  const { DB } = bindings();
  const goal = await DB.prepare(`SELECT g.id,g.status,rm.primary_position,rm.secondary_position FROM development_goals g
    JOIN roster_memberships rm ON rm.player_id=g.player_id AND rm.season_id=g.season_id AND rm.team_id='mens'
    WHERE g.id=? LIMIT 1`).bind(body.goalId).first<Row>();
  if (!goal) return Response.json({ error: "Development Goal nicht gefunden." }, { status: 404 });
  if (!isLinebacker(String(goal.primary_position ?? "")) && !isLinebacker(String(goal.secondary_position ?? ""))) return Response.json({ error: "Goal gehört nicht zum Linebacker-Pilot." }, { status: 409 });
  const id = crypto.randomUUID();
  const nextStatus = progressPct >= 100 ? "achieved" : progressPct > 0 && String(goal.status) === "open" ? "in-progress" : String(goal.status);
  await DB.batch([
    DB.prepare("INSERT INTO development_goal_progress (id,goal_id,progress_pct,note,recorded_by,recorded_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)")
      .bind(id, body.goalId, progressPct, body.note ?? "", actor.email),
    DB.prepare("UPDATE development_goals SET status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(nextStatus, actor.email, body.goalId),
  ]);
  return Response.json({ ok: true, id, progressPct, status: nextStatus }, { status: 201 });
}
