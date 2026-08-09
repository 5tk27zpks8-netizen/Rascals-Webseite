import { bindings } from "../../../lib/cms";
import { ensurePlaybookFoundationSchema, normalizePlaybookUnit } from "../../../lib/playbook-foundation";
import { requireCmsPermission } from "../../../lib/permissions";

type Row = Record<string, unknown>;
type Body = {
  action?: "create-formation" | "create-play";
  seasonId?: string;
  unit?: string;
  formationId?: string | null;
  name?: string;
  personnel?: string;
  family?: string;
  concept?: string;
  playType?: string;
};

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensurePlaybookFoundationSchema();
  const { DB } = bindings();
  const url = new URL(request.url);
  const unit = normalizePlaybookUnit(url.searchParams.get("unit"));
  const seasonId = url.searchParams.get("seasonId") ?? "";

  const formations = seasonId
    ? await DB.prepare(`SELECT id,season_id,unit,name,personnel,family,strength_rule,description,tags,active,updated_at
        FROM playbook_formations WHERE season_id=? AND unit=? AND active=1 ORDER BY name`)
        .bind(seasonId, unit).all<Row>()
    : { results: [] as Row[] };

  const plays = seasonId
    ? await DB.prepare(`SELECT p.id,p.season_id,p.formation_id,p.unit,p.name,p.call_name,p.concept,p.play_type,p.personnel,
        p.situation,p.down_distance,p.field_zone,p.hash,p.strength_call,p.front_call,p.coverage_call,p.checks_alerts,
        p.objective,p.coaching_points,p.tags,p.status,p.version,p.updated_at,f.name formation_name
        FROM playbook_plays p LEFT JOIN playbook_formations f ON f.id=p.formation_id
        WHERE p.season_id=? AND p.unit=? AND p.status!='archived' ORDER BY p.updated_at DESC,p.name`)
        .bind(seasonId, unit).all<Row>()
    : { results: [] as Row[] };

  return Response.json({
    current: actor,
    seasonId,
    unit,
    formations: formations.results.map((r) => ({
      id: String(r.id),
      seasonId: String(r.season_id),
      unit: String(r.unit),
      name: String(r.name ?? ""),
      personnel: String(r.personnel ?? ""),
      family: String(r.family ?? ""),
      strengthRule: String(r.strength_rule ?? ""),
      description: String(r.description ?? ""),
      tags: String(r.tags ?? ""),
      active: Number(r.active ?? 1) === 1,
      updatedAt: String(r.updated_at ?? ""),
    })),
    plays: plays.results.map((r) => ({
      id: String(r.id),
      seasonId: String(r.season_id),
      formationId: r.formation_id ? String(r.formation_id) : null,
      formationName: String(r.formation_name ?? ""),
      unit: String(r.unit),
      name: String(r.name ?? ""),
      callName: String(r.call_name ?? ""),
      concept: String(r.concept ?? ""),
      playType: String(r.play_type ?? ""),
      personnel: String(r.personnel ?? ""),
      situation: String(r.situation ?? ""),
      downDistance: String(r.down_distance ?? ""),
      fieldZone: String(r.field_zone ?? ""),
      hash: String(r.hash ?? ""),
      strengthCall: String(r.strength_call ?? ""),
      frontCall: String(r.front_call ?? ""),
      coverageCall: String(r.coverage_call ?? ""),
      checksAlerts: String(r.checks_alerts ?? ""),
      objective: String(r.objective ?? ""),
      coachingPoints: String(r.coaching_points ?? ""),
      tags: String(r.tags ?? ""),
      status: String(r.status ?? "draft"),
      version: Number(r.version ?? 1),
      updatedAt: String(r.updated_at ?? ""),
    })),
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensurePlaybookFoundationSchema();
  const body = await request.json() as Body;
  const { DB } = bindings();
  const unit = normalizePlaybookUnit(body.unit);

  if (body.action === "create-formation") {
    if (!body.seasonId || !body.name?.trim()) return Response.json({ error: "Saison und Formationsname sind erforderlich." }, { status: 400 });
    const id = crypto.randomUUID();
    await DB.prepare(`INSERT INTO playbook_formations
      (id,season_id,unit,name,personnel,family,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?)`)
      .bind(id, body.seasonId, unit, body.name.trim(), body.personnel?.trim() ?? "", body.family?.trim() ?? "", actor.email, actor.email).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  if (body.action === "create-play") {
    if (!body.seasonId || !body.name?.trim()) return Response.json({ error: "Saison und Playname sind erforderlich." }, { status: 400 });
    const id = crypto.randomUUID();
    await DB.prepare(`INSERT INTO playbook_plays
      (id,season_id,formation_id,unit,name,concept,play_type,personnel,status,created_by,updated_by)
      VALUES (?,?,?,?,?,?,?,?, 'draft',?,?)`)
      .bind(id, body.seasonId, body.formationId ?? null, unit, body.name.trim(), body.concept?.trim() ?? "", body.playType?.trim() ?? "", body.personnel?.trim() ?? "", actor.email, actor.email).run();
    return Response.json({ ok: true, id }, { status: 201 });
  }

  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
