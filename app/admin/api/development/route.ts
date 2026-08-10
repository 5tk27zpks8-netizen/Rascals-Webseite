import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { ensurePerformanceSchema } from "../../../lib/performance";
import { developmentNeedScore, ensureDevelopmentSchema, getLinebackerSkillDefinitions } from "../../../lib/development";
import { requireCmsPermission } from "../../../lib/permissions";

type SkillBody = {
  playerId?: string;
  skillKey?: string;
  current?: number;
  target?: number;
  priority?: number;
  note?: string;
};

const DEVELOPMENT_SKILLS = getLinebackerSkillDefinitions().map((skill) => [
  skill.key,
  skill.label,
  skill.category,
] as const);

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance" as never);
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensurePerformanceSchema();
  await ensureDevelopmentSchema();
  const { DB } = bindings();
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId");

  const playersResult = await DB.prepare(`SELECT id, first_name, last_name, jersey_number, position, unit
    FROM players WHERE active=1 ORDER BY unit, position, jersey_number, last_name`).all<Record<string, unknown>>();
  const players = playersResult.results.map((row) => ({
    id: String(row.id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
    position: String(row.position ?? ""),
    unit: String(row.unit ?? ""),
  }));

  if (playerId) {
    const rows = await DB.prepare("SELECT * FROM player_development_skills WHERE player_id=? ORDER BY category, skill_label").bind(playerId).all<Record<string, unknown>>();
    const saved = new Map(rows.results.map((row) => [String(row.skill_key), row]));
    const skills = DEVELOPMENT_SKILLS.map(([key, label, category]) => {
      const row = saved.get(key);
      const current = row ? Number(row.current_rating ?? 3) : 3;
      const target = row ? Number(row.target_rating ?? 5) : 5;
      const priority = row ? Number(row.priority ?? 2) : 2;
      return {
        key, label, category, current, target, priority,
        note: row ? String(row.note ?? "") : "",
        needScore: developmentNeedScore(current, target, priority),
        updatedAt: row ? String(row.updated_at ?? "") : "",
        updatedBy: row ? String(row.updated_by ?? "") : "",
      };
    });
    return Response.json({ current: actor, players, skills });
  }

  const aggregateRows = await DB.prepare(`SELECT skill_key, skill_label, category,
    AVG(current_rating) AS avg_current,
    AVG(target_rating) AS avg_target,
    AVG(priority) AS avg_priority,
    COUNT(*) AS player_count
    FROM player_development_skills
    GROUP BY skill_key, skill_label, category`).all<Record<string, unknown>>();

  const aggregateMap = new Map(aggregateRows.results.map((row) => [String(row.skill_key), row]));
  const teamNeeds = DEVELOPMENT_SKILLS.map(([key, label, category]) => {
    const row = aggregateMap.get(key);
    const current = row ? Number(row.avg_current ?? 0) : 0;
    const target = row ? Number(row.avg_target ?? 0) : 0;
    const priority = row ? Number(row.avg_priority ?? 0) : 0;
    const count = row ? Number(row.player_count ?? 0) : 0;
    return {
      key, label, category, current: Math.round(current * 20) / 20,
      target: Math.round(target * 20) / 20,
      priority: Math.round(priority * 10) / 10,
      count,
      needScore: count ? developmentNeedScore(current, target, priority) : 0,
    };
  }).sort((a, b) => b.needScore - a.needScore);

  const unitRows = await DB.prepare(`SELECT p.unit, d.skill_key, d.skill_label, d.category,
    AVG(d.current_rating) AS avg_current,
    AVG(d.target_rating) AS avg_target,
    AVG(d.priority) AS avg_priority,
    COUNT(*) AS player_count
    FROM player_development_skills d
    JOIN players p ON p.id=d.player_id
    WHERE p.active=1
    GROUP BY p.unit, d.skill_key, d.skill_label, d.category`).all<Record<string, unknown>>();

  const unitNeeds = unitRows.results.map((row) => {
    const current = Number(row.avg_current ?? 0);
    const target = Number(row.avg_target ?? 0);
    const priority = Number(row.avg_priority ?? 0);
    return {
      unit: String(row.unit ?? ""),
      key: String(row.skill_key),
      label: String(row.skill_label),
      category: String(row.category),
      current: Math.round(current * 20) / 20,
      target: Math.round(target * 20) / 20,
      priority: Math.round(priority * 10) / 10,
      count: Number(row.player_count ?? 0),
      needScore: developmentNeedScore(current, target, priority),
    };
  }).sort((a, b) => b.needScore - a.needScore);

  return Response.json({ current: actor, players, teamNeeds, unitNeeds });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("performance" as never);
  if (actor instanceof Response) return actor;
  await ensurePerformanceSchema();
  await ensureDevelopmentSchema();
  const body = await request.json() as SkillBody;
  if (!body.playerId || !body.skillKey) return Response.json({ error: "Spieler und Skill sind erforderlich." }, { status: 400 });
  const definition = DEVELOPMENT_SKILLS.find(([key]) => key === body.skillKey);
  if (!definition) return Response.json({ error: "Unbekannter Skill." }, { status: 400 });
  const [key, label, category] = definition;
  const current = clamp(body.current, 1, 5, 3);
  const target = clamp(body.target, 1, 5, 5);
  const priority = clamp(body.priority, 1, 3, 2);
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO player_development_skills
    (player_id,skill_key,skill_label,category,current_rating,target_rating,priority,note,updated_by,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(player_id,skill_key) DO UPDATE SET
      current_rating=excluded.current_rating,
      target_rating=excluded.target_rating,
      priority=excluded.priority,
      note=excluded.note,
      updated_by=excluded.updated_by,
      updated_at=CURRENT_TIMESTAMP`).bind(
        body.playerId, key, label, category, current, target, priority, body.note ?? "", actor.email,
      ).run();
  return Response.json({ ok: true, needScore: developmentNeedScore(current, target, priority) });
}
