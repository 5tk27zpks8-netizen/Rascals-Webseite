import { bindings } from "../../../lib/cms";
import { requireCmsPermission } from "../../../lib/permissions";
import { ensureRosterFoundation, mapRosterMembership, type AvailabilityStatus, type PlanningStatus, type RosterStatus } from "../../../lib/roster";

type RosterBody = {
  id?: string;
  seasonId?: string;
  teamId?: string;
  playerId?: string;
  jerseyNumber?: number | null;
  primaryPosition?: string;
  secondaryPosition?: string;
  unit?: "offense" | "defense" | "special-teams";
  rosterStatus?: RosterStatus;
  availability?: AvailabilityStatus;
  planningStatus?: PlanningStatus;
  starter?: boolean;
  captain?: boolean;
  rookie?: boolean;
  leadershipRole?: string;
  joinedAt?: string | null;
  leftAt?: string | null;
};

export async function GET(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  const url = new URL(request.url);
  const seasonId = url.searchParams.get("seasonId") || "season-2026";
  const teamId = url.searchParams.get("teamId") || "mens";
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT rm.*,p.first_name,p.last_name,p.slug,p.portrait
    FROM roster_memberships rm
    JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id=?
    ORDER BY rm.unit,rm.primary_position,rm.jersey_number,p.last_name`).bind(seasonId, teamId).all<Record<string, unknown>>();
  return Response.json({ items: result.results.map((row) => ({ ...mapRosterMembership(row), firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""), slug: String(row.slug ?? ""), portrait: String(row.portrait ?? "") })) });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  const body = await request.json() as RosterBody;
  if (!body.playerId || !body.seasonId) return Response.json({ error: "Spieler und Saison sind erforderlich." }, { status: 400 });
  if (body.jerseyNumber != null && (!Number.isInteger(body.jerseyNumber) || body.jerseyNumber < 0 || body.jerseyNumber > 99)) return Response.json({ error: "Trikotnummer muss zwischen 0 und 99 liegen." }, { status: 400 });
  const { DB } = bindings();
  if (body.jerseyNumber != null) {
    const duplicate = await DB.prepare("SELECT player_id FROM roster_memberships WHERE season_id=? AND team_id=? AND jersey_number=? AND player_id<>? LIMIT 1")
      .bind(body.seasonId, body.teamId ?? "mens", body.jerseyNumber, body.playerId).first<{ player_id: string }>();
    if (duplicate) return Response.json({ error: `Trikotnummer #${body.jerseyNumber} ist in diesem Saisonkader bereits vergeben.` }, { status: 409 });
  }
  const id = body.id || crypto.randomUUID();
  try {
    await DB.prepare(`INSERT INTO roster_memberships (id,season_id,team_id,player_id,jersey_number,primary_position,secondary_position,unit,roster_status,availability,planning_status,starter,captain,rookie,leadership_role,joined_at,left_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        id, body.seasonId, body.teamId ?? "mens", body.playerId, body.jerseyNumber ?? null, body.primaryPosition ?? "", body.secondaryPosition ?? "", body.unit ?? "defense",
        body.rosterStatus ?? "active", body.availability ?? "full", body.planningStatus ?? "unknown", body.starter ? 1 : 0, body.captain ? 1 : 0, body.rookie ? 1 : 0,
        body.leadershipRole ?? "", body.joinedAt ?? null, body.leftAt ?? null,
      ).run();
  } catch {
    return Response.json({ error: "Spieler ist bereits in diesem Saisonkader enthalten." }, { status: 409 });
  }
  const row = await DB.prepare("SELECT * FROM roster_memberships WHERE id=?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: mapRosterMembership(row!) }, { status: 201 });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  const body = await request.json() as RosterBody;
  if (!body.id) return Response.json({ error: "Roster-ID fehlt." }, { status: 400 });
  const { DB } = bindings();
  const existing = await DB.prepare("SELECT * FROM roster_memberships WHERE id=?").bind(body.id).first<Record<string, unknown>>();
  if (!existing) return Response.json({ error: "Roster-Eintrag nicht gefunden." }, { status: 404 });
  const seasonId = body.seasonId ?? String(existing.season_id);
  const teamId = body.teamId ?? String(existing.team_id);
  const playerId = body.playerId ?? String(existing.player_id);
  const jerseyNumber = body.jerseyNumber === undefined ? (existing.jersey_number == null ? null : Number(existing.jersey_number)) : body.jerseyNumber;
  if (jerseyNumber != null) {
    const duplicate = await DB.prepare("SELECT player_id FROM roster_memberships WHERE season_id=? AND team_id=? AND jersey_number=? AND id<>? LIMIT 1")
      .bind(seasonId, teamId, jerseyNumber, body.id).first<{ player_id: string }>();
    if (duplicate) return Response.json({ error: `Trikotnummer #${jerseyNumber} ist in diesem Saisonkader bereits vergeben.` }, { status: 409 });
  }
  await DB.prepare(`UPDATE roster_memberships SET season_id=?,team_id=?,player_id=?,jersey_number=?,primary_position=?,secondary_position=?,unit=?,roster_status=?,availability=?,planning_status=?,starter=?,captain=?,rookie=?,leadership_role=?,joined_at=?,left_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(
    seasonId, teamId, playerId, jerseyNumber, body.primaryPosition ?? String(existing.primary_position ?? ""), body.secondaryPosition ?? String(existing.secondary_position ?? ""),
    body.unit ?? String(existing.unit ?? "defense"), body.rosterStatus ?? String(existing.roster_status ?? "active"), body.availability ?? String(existing.availability ?? "full"),
    body.planningStatus ?? String(existing.planning_status ?? "unknown"), body.starter === undefined ? Number(existing.starter ?? 0) : (body.starter ? 1 : 0),
    body.captain === undefined ? Number(existing.captain ?? 0) : (body.captain ? 1 : 0), body.rookie === undefined ? Number(existing.rookie ?? 0) : (body.rookie ? 1 : 0),
    body.leadershipRole ?? String(existing.leadership_role ?? ""), body.joinedAt === undefined ? (existing.joined_at ? String(existing.joined_at) : null) : body.joinedAt,
    body.leftAt === undefined ? (existing.left_at ? String(existing.left_at) : null) : body.leftAt, body.id,
  ).run();
  const row = await DB.prepare("SELECT * FROM roster_memberships WHERE id=?").bind(body.id).first<Record<string, unknown>>();
  return Response.json({ item: mapRosterMembership(row!) });
}
