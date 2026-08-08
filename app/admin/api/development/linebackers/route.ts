import { bindings } from "../../../../lib/cms";
import { developmentNeedScore, ensureDevelopmentSchema, LINEBACKER_POSITIONS } from "../../../../lib/development";
import { requireCmsPermission } from "../../../../lib/permissions";

type EvaluationBody = {
  action?: "evaluate" | "goal";
  playerId?: string;
  seasonId?: string;
  skillKey?: string;
  current?: number;
  target?: number;
  priority?: number;
  confidence?: number;
  note?: string;
  evaluatedAt?: string;
  title?: string;
  dueDate?: string | null;
};

type GoalUpdateBody = {
  action?: "goal-status";
  goalId?: string;
  status?: "open" | "in-progress" | "achieved" | "paused";
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function isLinebackerPosition(position: string) {
  return (LINEBACKER_POSITIONS as readonly string[]).includes(position.trim().toUpperCase());
}

function mapSeason(row: Record<string, unknown>) {
  return { id: String(row.id), year: Number(row.year), name: String(row.name ?? ""), isCurrent: Number(row.is_current ?? 0) === 1 };
}

function mapPlayer(row: Record<string, unknown>) {
  return {
    id: String(row.player_id ?? row.id),
    rosterMembershipId: String(row.roster_membership_id ?? ""),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
    position: String(row.primary_position ?? ""),
    secondaryPosition: String(row.secondary_position ?? ""),
    availability: String(row.availability ?? "full"),
    rosterStatus: String(row.roster_status ?? "active"),
    starter: Number(row.starter ?? 0) === 1,
    captain: Number(row.captain ?? 0) === 1,
  };
}

function mapDefinition(row: Record<string, unknown>) {
  return {
    key: String(row.skill_key), label: String(row.label ?? row.skill_key), category: String(row.category ?? ""),
    description: String(row.description ?? ""), sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapEvaluation(row: Record<string, unknown>) {
  return {
    id: String(row.id), playerId: String(row.player_id), seasonId: String(row.season_id), skillKey: String(row.skill_key),
    current: Number(row.current_rating ?? 0), target: Number(row.target_rating ?? 0), priority: Number(row.priority ?? 2), confidence: Number(row.confidence ?? 3),
    note: String(row.note ?? ""), context: String(row.context ?? "coach-review"), evaluatedAt: String(row.evaluated_at ?? ""), evaluatedBy: String(row.evaluated_by ?? ""),
  };
}

function mapGoal(row: Record<string, unknown>) {
  return {
    id: String(row.id), playerId: String(row.player_id), seasonId: String(row.season_id), skillKey: row.skill_key ? String(row.skill_key) : null,
    title: String(row.title ?? ""), targetRating: row.target_rating == null ? null : Number(row.target_rating), dueDate: row.due_date ? String(row.due_date) : null,
    status: String(row.status ?? "open"), note: String(row.note ?? ""), createdBy: String(row.created_by ?? ""), updatedBy: String(row.updated_by ?? ""),
    createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  };
}

async function getSeasonAndPlayers(requestedSeasonId: string | null) {
  const { DB } = bindings();
  const seasonsResult = await DB.prepare("SELECT id,year,name,is_current FROM seasons ORDER BY year DESC").all<Record<string, unknown>>();
  const seasons = seasonsResult.results.map(mapSeason);
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? seasons.find((item) => item.isCurrent) ?? seasons[0] ?? null;
  if (!season) return { seasons, season: null, players: [] as ReturnType<typeof mapPlayer>[] };
  const result = await DB.prepare(`SELECT rm.id AS roster_membership_id,rm.player_id,rm.jersey_number,rm.primary_position,rm.secondary_position,rm.availability,rm.roster_status,rm.starter,rm.captain,p.first_name,p.last_name
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND rm.roster_status NOT IN ('left','alumni') AND p.active=1
    ORDER BY rm.primary_position,rm.jersey_number,p.last_name`).bind(season.id).all<Record<string, unknown>>();
  const players = result.results.map(mapPlayer).filter((player) => isLinebackerPosition(player.position) || isLinebackerPosition(player.secondaryPosition));
  return { seasons, season, players };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureDevelopmentSchema();
  const { DB } = bindings();
  const url = new URL(request.url);
  const { seasons, season, players } = await getSeasonAndPlayers(url.searchParams.get("seasonId"));
  if (!season) return Response.json({ error: "Keine Saison vorhanden." }, { status: 404 });

  const definitionsResult = await DB.prepare("SELECT * FROM development_skill_definitions WHERE position_group='LB' AND active=1 ORDER BY sort_order,skill_key").all<Record<string, unknown>>();
  const definitions = definitionsResult.results.map(mapDefinition);
  const playerIds = new Set(players.map((player) => player.id));
  const evaluationResult = await DB.prepare(`SELECT * FROM player_skill_evaluations WHERE season_id=? ORDER BY evaluated_at DESC,created_at DESC`).bind(season.id).all<Record<string, unknown>>();
  const evaluations = evaluationResult.results.map(mapEvaluation).filter((entry) => playerIds.has(entry.playerId));

  // Only the latest evaluation per player + skill contributes to Position Room aggregates.
  const latestByPlayerSkill = new Map<string, ReturnType<typeof mapEvaluation>>();
  for (const entry of evaluations) {
    const key = `${entry.playerId}|${entry.skillKey}`;
    if (!latestByPlayerSkill.has(key)) latestByPlayerSkill.set(key, entry);
  }
  const groupNeeds = definitions.map((definition) => {
    const rows = [...latestByPlayerSkill.values()].filter((entry) => entry.skillKey === definition.key);
    const avg = (key: "current" | "target" | "priority") => rows.length ? rows.reduce((sum, row) => sum + row[key], 0) / rows.length : 0;
    const current = avg("current"); const target = avg("target"); const priority = avg("priority");
    return {
      key: definition.key, label: definition.label, category: definition.category, count: rows.length,
      current: Math.round(current * 10) / 10, target: Math.round(target * 10) / 10, priority: Math.round(priority * 10) / 10,
      needScore: rows.length ? developmentNeedScore(current, target, priority) : 0,
      coveragePct: players.length ? Math.round((rows.length / players.length) * 100) : 0,
    };
  }).sort((a, b) => b.needScore - a.needScore || a.label.localeCompare(b.label));

  const requestedPlayerId = url.searchParams.get("playerId") || "";
  const selectedPlayer = players.find((player) => player.id === requestedPlayerId) ?? players[0] ?? null;
  if (!selectedPlayer) {
    return Response.json({ current: actor, seasons, season, players, definitions, groupNeeds, player: null });
  }

  const playerEvaluations = evaluations.filter((entry) => entry.playerId === selectedPlayer.id);
  const latest = new Map<string, ReturnType<typeof mapEvaluation>>();
  const previous = new Map<string, ReturnType<typeof mapEvaluation>>();
  for (const entry of playerEvaluations) {
    if (!latest.has(entry.skillKey)) latest.set(entry.skillKey, entry);
    else if (!previous.has(entry.skillKey)) previous.set(entry.skillKey, entry);
  }
  const skills = definitions.map((definition) => {
    const current = latest.get(definition.key);
    const before = previous.get(definition.key);
    const currentRating = current?.current ?? 3;
    const targetRating = current?.target ?? 5;
    const priority = current?.priority ?? 2;
    return {
      ...definition,
      current: currentRating,
      target: targetRating,
      priority,
      confidence: current?.confidence ?? 3,
      note: current?.note ?? "",
      needScore: developmentNeedScore(currentRating, targetRating, priority),
      delta: before ? Math.round((currentRating - before.current) * 10) / 10 : null,
      lastEvaluatedAt: current?.evaluatedAt ?? null,
      lastEvaluatedBy: current?.evaluatedBy ?? "",
      history: playerEvaluations.filter((entry) => entry.skillKey === definition.key).slice(0, 12),
    };
  });

  const goalsResult = await DB.prepare("SELECT * FROM development_goals WHERE player_id=? AND season_id=? ORDER BY CASE status WHEN 'in-progress' THEN 0 WHEN 'open' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END,COALESCE(due_date,'9999-12-31'),updated_at DESC")
    .bind(selectedPlayer.id, season.id).all<Record<string, unknown>>();
  const goals = goalsResult.results.map(mapGoal);

  const statsResult = await DB.prepare(`SELECT stat_key,SUM(stat_value) AS total FROM player_game_stats
    WHERE player_id=? AND season_id=? AND status='official' GROUP BY stat_key ORDER BY stat_key`).bind(selectedPlayer.id, season.id).all<Record<string, unknown>>();
  const officialStats = Object.fromEntries(statsResult.results.map((row) => [String(row.stat_key), Number(row.total ?? 0)]));

  const yearPrefix = String(season.year);
  const performanceResult = await DB.prepare(`SELECT occurred_at,attendance,effort,execution,discipline,impact,overall,context
    FROM player_performance_entries WHERE player_id=? AND substr(occurred_at,1,4)=? ORDER BY occurred_at DESC`).bind(selectedPlayer.id, yearPrefix).all<Record<string, unknown>>();
  const performanceRows = performanceResult.results;
  const trainingRows = performanceRows.filter((row) => String(row.context) === "training" && ["present", "absent"].includes(String(row.attendance)));
  const attendancePct = trainingRows.length ? Math.round((trainingRows.filter((row) => String(row.attendance) === "present").length / trainingRows.length) * 100) : null;
  const ratingValues = performanceRows.flatMap((row) => [row.overall ?? row.execution]).map(Number).filter((value) => Number.isFinite(value));
  const performanceIndex = ratingValues.length ? Math.round((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length) * 20) : null;

  const evaluatedSkills = skills.filter((skill) => skill.lastEvaluatedAt);
  const currentIndex = evaluatedSkills.length ? Math.round((evaluatedSkills.reduce((sum, skill) => sum + skill.current, 0) / evaluatedSkills.length) * 20) : null;
  const needIndex = evaluatedSkills.length ? Math.round(evaluatedSkills.reduce((sum, skill) => sum + skill.needScore, 0) / evaluatedSkills.length) : null;
  const improved = skills.filter((skill) => skill.delta != null && skill.delta > 0).length;
  const declined = skills.filter((skill) => skill.delta != null && skill.delta < 0).length;

  return Response.json({
    current: actor, seasons, season, players, definitions, groupNeeds,
    player: selectedPlayer,
    skills,
    goals,
    evidence: { officialStats, attendancePct, performanceIndex, performanceEntries: performanceRows.length },
    summary: { currentIndex, needIndex, evaluated: evaluatedSkills.length, totalSkills: skills.length, improved, declined, openGoals: goals.filter((goal) => goal.status !== "achieved").length },
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureDevelopmentSchema();
  const body = await request.json() as EvaluationBody;
  if (!body.playerId || !body.seasonId) return Response.json({ error: "Spieler und Saison sind erforderlich." }, { status: 400 });
  const { DB } = bindings();
  const membership = await DB.prepare(`SELECT primary_position,secondary_position FROM roster_memberships WHERE player_id=? AND season_id=? AND team_id='mens' LIMIT 1`)
    .bind(body.playerId, body.seasonId).first<Record<string, unknown>>();
  if (!membership) return Response.json({ error: "Spieler gehört nicht zu diesem Saisonkader." }, { status: 409 });
  if (!isLinebackerPosition(String(membership.primary_position ?? "")) && !isLinebackerPosition(String(membership.secondary_position ?? ""))) return Response.json({ error: "Der Linebacker-Pilot ist aktuell nur für LB-Spieler freigegeben." }, { status: 409 });

  if ((body.action ?? "evaluate") === "evaluate") {
    if (!body.skillKey) return Response.json({ error: "Skill ist erforderlich." }, { status: 400 });
    const definition = await DB.prepare("SELECT * FROM development_skill_definitions WHERE skill_key=? AND position_group='LB' AND active=1 LIMIT 1").bind(body.skillKey).first<Record<string, unknown>>();
    if (!definition) return Response.json({ error: "Unbekannter Linebacker-Skill." }, { status: 400 });
    const current = clamp(body.current, 1, 5, 3);
    const target = clamp(body.target, 1, 5, 5);
    const priority = Math.round(clamp(body.priority, 1, 3, 2));
    const confidence = Math.round(clamp(body.confidence, 1, 5, 3));
    const evaluatedAt = body.evaluatedAt?.trim() || new Date().toISOString().slice(0, 10);
    const id = crypto.randomUUID();
    await DB.batch([
      DB.prepare(`INSERT INTO player_skill_evaluations
        (id,player_id,season_id,skill_key,current_rating,target_rating,priority,confidence,note,context,evaluated_at,evaluated_by)
        VALUES (?,?,?,?,?,?,?,?,?,'coach-review',?,?)`).bind(id, body.playerId, body.seasonId, body.skillKey, current, target, priority, confidence, body.note ?? "", evaluatedAt, actor.email),
      DB.prepare(`INSERT INTO player_development_skills
        (player_id,skill_key,skill_label,category,current_rating,target_rating,priority,note,updated_by,updated_at,season_id)
        VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?)
        ON CONFLICT(player_id,skill_key) DO UPDATE SET current_rating=excluded.current_rating,target_rating=excluded.target_rating,priority=excluded.priority,
          note=excluded.note,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP,season_id=excluded.season_id`)
        .bind(body.playerId, body.skillKey, String(definition.label ?? body.skillKey), String(definition.category ?? "LB"), current, target, priority, body.note ?? "", actor.email, body.seasonId),
    ]);
    return Response.json({ ok: true, id, needScore: developmentNeedScore(current, target, priority) }, { status: 201 });
  }

  if (body.action === "goal") {
    if (!body.title?.trim()) return Response.json({ error: "Zielbezeichnung ist erforderlich." }, { status: 400 });
    if (body.skillKey) {
      const definition = await DB.prepare("SELECT 1 FROM development_skill_definitions WHERE skill_key=? AND position_group='LB' AND active=1 LIMIT 1").bind(body.skillKey).first();
      if (!definition) return Response.json({ error: "Unbekannter Linebacker-Skill." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const targetRating = body.target == null ? null : clamp(body.target, 1, 5, 5);
    await DB.prepare(`INSERT INTO development_goals
      (id,player_id,season_id,skill_key,title,target_rating,due_date,status,note,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,'open',?,?,?)`).bind(id, body.playerId, body.seasonId, body.skillKey ?? null, body.title.trim(), targetRating, body.dueDate ?? null, body.note ?? "", actor.email, actor.email).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureDevelopmentSchema();
  const body = await request.json() as GoalUpdateBody;
  if (body.action !== "goal-status" || !body.goalId || !body.status) return Response.json({ error: "Ziel und Status sind erforderlich." }, { status: 400 });
  if (!["open", "in-progress", "achieved", "paused"].includes(body.status)) return Response.json({ error: "Ungültiger Zielstatus." }, { status: 400 });
  const { DB } = bindings();
  const result = await DB.prepare("UPDATE development_goals SET status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(body.status, actor.email, body.goalId).run();
  if (!result.meta.changes) return Response.json({ error: "Ziel nicht gefunden." }, { status: 404 });
  return Response.json({ ok: true });
}
