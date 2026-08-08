import { bindings } from "../../../../lib/cms";
import { developmentNeedScore, getGroupSkills, getPositionGroup, matchesPositionGroup, POSITION_GROUPS, type PositionGroupKey } from "../../../../lib/position-development";
import { ensurePositionDrills } from "../../../../lib/position-drills";
import { requireCmsPermission } from "../../../../lib/permissions";

type Row = Record<string, unknown>;
type Body = {
  action?: "evaluate" | "goal" | "goal-status" | "settings";
  seasonId?: string;
  group?: PositionGroupKey;
  playerId?: string;
  skillKey?: string;
  current?: number;
  target?: number;
  priority?: number;
  confidence?: number;
  note?: string;
  evaluatedAt?: string;
  title?: string;
  dueDate?: string | null;
  goalId?: string;
  status?: "open" | "in-progress" | "achieved" | "paused";
  targetCoveragePct?: number;
  reviewCadenceDays?: number;
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function mapEvaluation(row: Row) {
  return {
    id: String(row.id), playerId: String(row.player_id), seasonId: String(row.season_id), skillKey: String(row.skill_key),
    current: Number(row.current_rating ?? 0), target: Number(row.target_rating ?? 0), priority: Number(row.priority ?? 2), confidence: Number(row.confidence ?? 3),
    note: String(row.note ?? ""), evaluatedAt: String(row.evaluated_at ?? ""), evaluatedBy: String(row.evaluated_by ?? ""), context: String(row.context ?? "coach-review"),
  };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensurePositionDrills();
  const { DB } = bindings();
  const url = new URL(request.url);
  const group = getPositionGroup(url.searchParams.get("group"));

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
  })).filter((player) => matchesPositionGroup(group, player.position, player.secondaryPosition));
  const playerIds = new Set(players.map((player) => player.id));

  const skills = await getGroupSkills(group.key);
  const skillKeys = new Set(skills.map((skill) => skill.key));
  const evaluationResult = await DB.prepare(`SELECT * FROM player_skill_evaluations WHERE season_id=? ORDER BY evaluated_at DESC,created_at DESC`).bind(season.id).all<Row>();
  const evaluations = evaluationResult.results.map(mapEvaluation).filter((entry) => playerIds.has(entry.playerId) && skillKeys.has(entry.skillKey));
  const latest = new Map<string, ReturnType<typeof mapEvaluation>>();
  const previous = new Map<string, ReturnType<typeof mapEvaluation>>();
  for (const entry of evaluations) {
    const key = `${entry.playerId}|${entry.skillKey}`;
    if (!latest.has(key)) latest.set(key, entry);
    else if (!previous.has(key)) previous.set(key, entry);
  }

  const drillResult = await DB.prepare(`SELECT l.skill_key,d.id,d.title,d.phase,d.intensity,d.min_minutes,d.max_minutes,d.description,d.coaching_points,l.relevance
    FROM development_skill_drills l JOIN development_drills d ON d.id=l.drill_id
    WHERE d.position_group=? AND d.active=1 ORDER BY l.skill_key,l.relevance DESC,d.title`).bind(group.key).all<Row>();
  const drillsBySkill = new Map<string, Array<Record<string, unknown>>>();
  for (const row of drillResult.results) {
    const skillKey = String(row.skill_key);
    if (!drillsBySkill.has(skillKey)) drillsBySkill.set(skillKey, []);
    drillsBySkill.get(skillKey)!.push({ id: String(row.id), title: String(row.title ?? ""), phase: String(row.phase ?? "indy"), intensity: String(row.intensity ?? "medium"), minMinutes: Number(row.min_minutes ?? 8), maxMinutes: Number(row.max_minutes ?? 15), description: String(row.description ?? ""), coachingPoints: String(row.coaching_points ?? ""), relevance: Number(row.relevance ?? 100) });
  }

  const groupNeeds = skills.map((skill) => {
    const rows = players.map((player) => latest.get(`${player.id}|${skill.key}`)).filter((entry): entry is ReturnType<typeof mapEvaluation> => Boolean(entry));
    const current = avg(rows.map((entry) => entry.current));
    const target = avg(rows.map((entry) => entry.target));
    const priority = avg(rows.map((entry) => entry.priority));
    const confidence = avg(rows.map((entry) => entry.confidence));
    const needScore = rows.length ? developmentNeedScore(current, target, priority) : 0;
    const coveragePct = players.length ? Math.round((rows.length / players.length) * 100) : 0;
    const trendRows = rows.map((entry) => {
      const before = previous.get(`${entry.playerId}|${entry.skillKey}`);
      return before ? entry.current - before.current : null;
    }).filter((value): value is number => value != null);
    const evidenceFactor = Math.min(1, coveragePct / 80) * Math.min(1, confidence / 4);
    const trainingScore = Math.round(needScore * (0.7 + 0.3 * evidenceFactor));
    return {
      ...skill, count: rows.length, current: round1(current), target: round1(target), priority: round1(priority), confidence: round1(confidence), needScore,
      coveragePct, trainingScore, trend: trendRows.length ? round1(avg(trendRows)) : null,
      state: coveragePct < 40 ? "evaluate-first" : trainingScore >= 50 ? "focus" : trainingScore >= 25 ? "improve" : "maintain",
      drills: (drillsBySkill.get(skill.key) ?? []).slice(0, 3),
    };
  }).sort((a, b) => b.trainingScore - a.trainingScore || b.needScore - a.needScore || a.sortOrder - b.sortOrder);

  const requestedPlayerId = url.searchParams.get("playerId") || "";
  const selectedPlayer = players.find((player) => player.id === requestedPlayerId) ?? players[0] ?? null;
  let player = null as null | Record<string, unknown>;
  if (selectedPlayer) {
    const playerEvaluations = evaluations.filter((entry) => entry.playerId === selectedPlayer.id);
    const playerSkills = skills.map((skill) => {
      const current = latest.get(`${selectedPlayer.id}|${skill.key}`);
      const before = previous.get(`${selectedPlayer.id}|${skill.key}`);
      const currentRating = current?.current ?? 3;
      const targetRating = current?.target ?? 5;
      const priority = current?.priority ?? 2;
      return {
        ...skill, current: currentRating, target: targetRating, priority, confidence: current?.confidence ?? 3, note: current?.note ?? "",
        needScore: developmentNeedScore(currentRating, targetRating, priority), delta: before ? round1(currentRating - before.current) : null,
        lastEvaluatedAt: current?.evaluatedAt ?? null, lastEvaluatedBy: current?.evaluatedBy ?? "",
        history: playerEvaluations.filter((entry) => entry.skillKey === skill.key).slice(0, 10),
        drills: (drillsBySkill.get(skill.key) ?? []).slice(0, 3),
      };
    });
    const goalsResult = await DB.prepare(`SELECT * FROM development_goals WHERE player_id=? AND season_id=?
      ORDER BY CASE status WHEN 'in-progress' THEN 0 WHEN 'open' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,COALESCE(due_date,'9999-12-31'),updated_at DESC`)
      .bind(selectedPlayer.id, season.id).all<Row>();
    const goals = goalsResult.results.map((row) => ({
      id: String(row.id), skillKey: row.skill_key ? String(row.skill_key) : null, title: String(row.title ?? ""), targetRating: row.target_rating == null ? null : Number(row.target_rating),
      dueDate: row.due_date ? String(row.due_date) : null, status: String(row.status ?? "open"), note: String(row.note ?? ""), updatedAt: String(row.updated_at ?? ""),
    })).filter((goal) => !goal.skillKey || skillKeys.has(goal.skillKey));

    let officialStats: Record<string, number> = {};
    if (group.statKeys.length) {
      const statsResult = await DB.prepare(`SELECT stat_key,SUM(stat_value) AS total FROM player_game_stats WHERE player_id=? AND season_id=? AND status='official' GROUP BY stat_key ORDER BY stat_key`)
        .bind(selectedPlayer.id, season.id).all<Row>();
      officialStats = Object.fromEntries(statsResult.results.filter((row) => group.statKeys.includes(String(row.stat_key))).map((row) => [String(row.stat_key), Number(row.total ?? 0)]));
    }

    const perfResult = await DB.prepare(`SELECT occurred_at,attendance,effort,execution,discipline,impact,overall,context FROM player_performance_entries
      WHERE player_id=? AND substr(occurred_at,1,4)=? ORDER BY occurred_at DESC`).bind(selectedPlayer.id, String(season.year)).all<Row>();
    const training = perfResult.results.filter((row) => String(row.context) === "training" && ["present", "absent"].includes(String(row.attendance)));
    const attendancePct = training.length ? Math.round((training.filter((row) => String(row.attendance) === "present").length / training.length) * 100) : null;
    const ratedSkills = playerSkills.filter((skill) => skill.lastEvaluatedAt);
    player = {
      profile: selectedPlayer,
      skills: playerSkills,
      goals,
      evidence: { officialStats, attendancePct, performanceEntries: perfResult.results.length },
      summary: {
        evaluated: ratedSkills.length,
        totalSkills: skills.length,
        coveragePct: skills.length ? Math.round((ratedSkills.length / skills.length) * 100) : 0,
        currentIndex: ratedSkills.length ? Math.round(avg(ratedSkills.map((skill) => skill.current)) * 20) : null,
        needIndex: ratedSkills.length ? Math.round(avg(ratedSkills.map((skill) => skill.needScore))) : null,
        improved: playerSkills.filter((skill) => skill.delta != null && skill.delta > 0).length,
        declined: playerSkills.filter((skill) => skill.delta != null && skill.delta < 0).length,
        openGoals: goals.filter((goal) => goal.status !== "achieved").length,
      },
    };
  }

  const settings = await DB.prepare("SELECT target_coverage_pct,review_cadence_days,updated_by,updated_at FROM position_development_settings WHERE season_id=? AND position_group=? LIMIT 1")
    .bind(season.id, group.key).first<Row>();
  const overallCoverage = players.length && skills.length ? Math.round((latest.size / (players.length * skills.length)) * 100) : 0;
  const evaluatedNeeds = groupNeeds.filter((item) => item.count > 0);
  return Response.json({
    current: actor, groups: POSITION_GROUPS, group, seasons, season, players, selectedPlayerId: selectedPlayer?.id ?? "", skills, groupNeeds, player,
    settings: { targetCoveragePct: Number(settings?.target_coverage_pct ?? 80), reviewCadenceDays: Number(settings?.review_cadence_days ?? 28) },
    summary: {
      players: players.length, coveragePct: overallCoverage,
      currentIndex: latest.size ? Math.round(avg([...latest.values()].map((entry) => entry.current)) * 20) : null,
      needIndex: evaluatedNeeds.length ? Math.round(avg(evaluatedNeeds.map((item) => item.needScore))) : null,
      focusSkills: groupNeeds.filter((item) => item.state === "focus").length,
      evaluateFirst: groupNeeds.filter((item) => item.state === "evaluate-first").length,
    },
  });
}

async function validateMembership(DB: ReturnType<typeof bindings>["DB"], playerId: string, seasonId: string, groupKey: PositionGroupKey) {
  const group = getPositionGroup(groupKey);
  const row = await DB.prepare(`SELECT primary_position,secondary_position FROM roster_memberships WHERE player_id=? AND season_id=? AND team_id='mens' AND roster_status NOT IN ('left','alumni') LIMIT 1`)
    .bind(playerId, seasonId).first<Row>();
  return Boolean(row && matchesPositionGroup(group, String(row.primary_position ?? ""), String(row.secondary_position ?? "")));
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensurePositionDrills();
  const body = await request.json() as Body;
  const { DB } = bindings();
  const group = getPositionGroup(body.group);
  if (!body.playerId || !body.seasonId) return Response.json({ error: "Spieler und Saison sind erforderlich." }, { status: 400 });
  if (!await validateMembership(DB, body.playerId, body.seasonId, group.key)) return Response.json({ error: `Spieler gehört in dieser Saison nicht zur Positionsgruppe ${group.label}.` }, { status: 409 });

  if ((body.action ?? "evaluate") === "evaluate") {
    if (!body.skillKey) return Response.json({ error: "Skill ist erforderlich." }, { status: 400 });
    const definition = await DB.prepare("SELECT skill_key FROM development_skill_definitions WHERE skill_key=? AND position_group=? AND active=1 LIMIT 1").bind(body.skillKey, group.key).first();
    if (!definition) return Response.json({ error: "Skill gehört nicht zu dieser Positionsgruppe." }, { status: 400 });
    const current = clamp(body.current, 1, 5, 3);
    const target = clamp(body.target, 1, 5, 5);
    const priority = Math.round(clamp(body.priority, 1, 3, 2));
    const confidence = Math.round(clamp(body.confidence, 1, 5, 3));
    const id = crypto.randomUUID();
    const evaluatedAt = body.evaluatedAt?.trim() || new Date().toISOString().slice(0, 10);
    await DB.prepare(`INSERT INTO player_skill_evaluations
      (id,player_id,season_id,skill_key,current_rating,target_rating,priority,confidence,note,context,evaluated_at,evaluated_by)
      VALUES (?,?,?,?,?,?,?,?,?,'coach-review',?,?)`).bind(id, body.playerId, body.seasonId, body.skillKey, current, target, priority, confidence, body.note ?? "", evaluatedAt, actor.email).run();
    return Response.json({ ok: true, id, needScore: developmentNeedScore(current, target, priority) }, { status: 201 });
  }

  if (body.action === "goal") {
    if (!body.title?.trim()) return Response.json({ error: "Zielbezeichnung ist erforderlich." }, { status: 400 });
    if (body.skillKey) {
      const valid = await DB.prepare("SELECT 1 FROM development_skill_definitions WHERE skill_key=? AND position_group=? AND active=1 LIMIT 1").bind(body.skillKey, group.key).first();
      if (!valid) return Response.json({ error: "Goal-Skill gehört nicht zur gewählten Positionsgruppe." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    await DB.prepare(`INSERT INTO development_goals
      (id,player_id,season_id,skill_key,title,target_rating,due_date,status,note,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,'open',?,?,?)`).bind(id, body.playerId, body.seasonId, body.skillKey ?? null, body.title.trim(), body.target == null ? null : clamp(body.target, 1, 5, 5), body.dueDate || null, body.note ?? "", actor.email, actor.email).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensurePositionDrills();
  const body = await request.json() as Body;
  const { DB } = bindings();

  if (body.action === "goal-status") {
    if (!body.goalId || !body.status || !["open", "in-progress", "achieved", "paused"].includes(body.status)) return Response.json({ error: "Ziel und gültiger Status sind erforderlich." }, { status: 400 });
    const result = await DB.prepare("UPDATE development_goals SET status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.status, actor.email, body.goalId).run();
    if (!result.meta.changes) return Response.json({ error: "Ziel nicht gefunden." }, { status: 404 });
    return Response.json({ ok: true });
  }

  if (body.action === "settings") {
    if (!body.seasonId || !body.group) return Response.json({ error: "Saison und Positionsgruppe sind erforderlich." }, { status: 400 });
    const group = getPositionGroup(body.group);
    const coverage = Math.round(clamp(body.targetCoveragePct, 40, 100, 80));
    const cadence = Math.round(clamp(body.reviewCadenceDays, 7, 120, 28));
    await DB.prepare(`INSERT INTO position_development_settings (season_id,position_group,target_coverage_pct,review_cadence_days,updated_by,updated_at)
      VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(season_id,position_group) DO UPDATE SET target_coverage_pct=excluded.target_coverage_pct,review_cadence_days=excluded.review_cadence_days,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
      .bind(body.seasonId, group.key, coverage, cadence, actor.email).run();
    return Response.json({ ok: true, targetCoveragePct: coverage, reviewCadenceDays: cadence });
  }

  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
