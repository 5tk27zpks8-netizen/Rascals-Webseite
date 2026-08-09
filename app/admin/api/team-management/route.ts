import { bindings } from "../../../lib/cms";
import { ensureCoachesSchema } from "../../../lib/coaches";
import { ensureRosterFoundation } from "../../../lib/roster";
import { requireCmsPermission } from "../../../lib/permissions";

type Row = Record<string, unknown>;

type UpdateBody = {
  action?: "roster-update";
  seasonId?: string;
  playerId?: string;
  rosterStatus?: string;
  availability?: string;
  planningStatus?: string;
  starter?: boolean;
  captain?: boolean;
};

const groups = [
  ["QB", ["QB"]],
  ["RB", ["RB", "HB", "FB"]],
  ["WR/TE", ["WR", "TE", "X", "Z", "SLOT"]],
  ["OL", ["OL", "LT", "LG", "C", "RG", "RT", "G", "T"]],
  ["DL", ["DL", "DE", "DT", "NT", "EDGE"]],
  ["LB", ["LB", "MLB", "ILB", "OLB", "WILL", "MIKE", "SAM"]],
  ["DB", ["DB", "CB", "FS", "SS", "S", "NB", "NICKEL"]],
  ["ST", ["K", "P", "LS", "KR", "PR", "ST"]],
] as const;

function matches(aliases: readonly string[], primary: string, secondary: string) {
  const p = primary.trim().toUpperCase();
  const s = secondary.trim().toUpperCase();
  return aliases.includes(p) || aliases.includes(s);
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("players");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  await ensureCoachesSchema();
  const { DB } = bindings();
  const url = new URL(request.url);

  const seasonsResult = await DB.prepare("SELECT id,year,name,status,is_current,starts_at,ends_at FROM seasons ORDER BY year DESC").all<Row>();
  const seasons = seasonsResult.results.map((row) => ({
    id: String(row.id), year: Number(row.year), name: String(row.name ?? ""), status: String(row.status ?? "planning"),
    isCurrent: Number(row.is_current ?? 0) === 1, startsAt: row.starts_at ? String(row.starts_at) : null, endsAt: row.ends_at ? String(row.ends_at) : null,
  }));
  const season = seasons.find((item) => item.id === url.searchParams.get("seasonId")) ?? seasons.find((item) => item.isCurrent) ?? seasons[0] ?? null;
  if (!season) return Response.json({ error: "Keine Saison vorhanden." }, { status: 404 });

  const rosterResult = await DB.prepare(`SELECT rm.*,p.first_name,p.last_name,p.nickname,p.portrait,p.height_cm,p.weight_kg
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND p.active=1
    ORDER BY CASE rm.unit WHEN 'offense' THEN 0 WHEN 'defense' THEN 1 ELSE 2 END,rm.primary_position,rm.jersey_number,p.last_name`)
    .bind(season.id).all<Row>();
  const roster = rosterResult.results.map((row) => ({
    id: String(row.id), playerId: String(row.player_id), jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
    firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""), nickname: String(row.nickname ?? ""), portrait: String(row.portrait ?? ""),
    primaryPosition: String(row.primary_position ?? ""), secondaryPosition: String(row.secondary_position ?? ""), unit: String(row.unit ?? "defense"),
    rosterStatus: String(row.roster_status ?? "active"), availability: String(row.availability ?? "full"), planningStatus: String(row.planning_status ?? "unknown"),
    starter: Number(row.starter ?? 0) === 1, captain: Number(row.captain ?? 0) === 1, rookie: Number(row.rookie ?? 0) === 1,
    leadershipRole: String(row.leadership_role ?? ""), heightCm: row.height_cm == null ? null : Number(row.height_cm), weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
  }));

  const activeRoster = roster.filter((player) => !["left", "alumni"].includes(player.rosterStatus));
  const gameReady = activeRoster.filter((player) => !["out", "return-to-play"].includes(player.availability) && !["injured", "suspended"].includes(player.rosterStatus));
  const limited = activeRoster.filter((player) => ["limited", "questionable", "return-to-play"].includes(player.availability));
  const out = activeRoster.filter((player) => player.availability === "out" || ["injured", "suspended"].includes(player.rosterStatus));

  const positionGroups = groups.map(([label, aliases]) => {
    const players = activeRoster.filter((player) => matches(aliases, player.primaryPosition, player.secondaryPosition));
    const ready = players.filter((player) => gameReady.some((item) => item.playerId === player.playerId));
    return { label, players: players.length, gameReady: ready.length, starters: players.filter((player) => player.starter).length, limited: players.filter((player) => limited.some((item) => item.playerId === player.playerId)).length };
  });

  const depthResult = await DB.prepare(`SELECT d.position_group,d.position,d.rank,d.player_id,p.first_name,p.last_name,rm.jersey_number
    FROM depth_chart_entries d
    LEFT JOIN players p ON p.id=d.player_id
    LEFT JOIN roster_memberships rm ON rm.player_id=d.player_id AND rm.season_id=d.season_id AND rm.team_id=d.team_id
    WHERE d.season_id=? AND d.team_id='mens' AND d.valid_to IS NULL
    ORDER BY d.position_group,d.position,d.rank`).bind(season.id).all<Row>();
  const depth = depthResult.results.map((row) => ({
    positionGroup: String(row.position_group ?? ""), position: String(row.position ?? ""), rank: Number(row.rank ?? 1), playerId: String(row.player_id ?? ""),
    firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""), jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
  }));

  const coachesResult = await DB.prepare("SELECT id,first_name,last_name,role,photo,active,sort_order FROM coaches WHERE deleted_at IS NULL ORDER BY sort_order,last_name,first_name").all<Row>();
  const coaches = coachesResult.results.map((row) => ({
    id: String(row.id), firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""), role: String(row.role ?? ""), photo: String(row.photo ?? ""), active: Number(row.active ?? 1) === 1,
  }));

  const planning = {
    returning: activeRoster.filter((player) => player.planningStatus === "returning").length,
    unsure: activeRoster.filter((player) => player.planningStatus === "unsure").length,
    leaving: activeRoster.filter((player) => player.planningStatus === "leaving").length,
    unknown: activeRoster.filter((player) => player.planningStatus === "unknown").length,
  };

  return Response.json({
    current: actor, seasons, season, roster, depth, coaches, positionGroups, planning,
    summary: {
      roster: activeRoster.length, gameReady: gameReady.length, gameReadyPct: activeRoster.length ? Math.round((gameReady.length / activeRoster.length) * 100) : 0,
      limited: limited.length, out: out.length, starters: activeRoster.filter((player) => player.starter).length, captains: activeRoster.filter((player) => player.captain).length,
      rookies: activeRoster.filter((player) => player.rookie).length, coaches: coaches.filter((coach) => coach.active).length,
      depthPositions: new Set(depth.map((entry) => entry.position)).size,
    },
  });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("players");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  const body = await request.json() as UpdateBody;
  if (body.action !== "roster-update" || !body.seasonId || !body.playerId) return Response.json({ error: "Ungültige Aktualisierung." }, { status: 400 });

  const allowedRoster = ["active", "practice-squad", "reserve", "injured", "suspended", "left", "alumni"];
  const allowedAvailability = ["full", "limited", "questionable", "out", "return-to-play"];
  const allowedPlanning = ["unknown", "returning", "unsure", "leaving"];
  const rosterStatus = allowedRoster.includes(body.rosterStatus ?? "") ? body.rosterStatus : "active";
  const availability = allowedAvailability.includes(body.availability ?? "") ? body.availability : "full";
  const planningStatus = allowedPlanning.includes(body.planningStatus ?? "") ? body.planningStatus : "unknown";

  const { DB } = bindings();
  const exists = await DB.prepare("SELECT id FROM roster_memberships WHERE season_id=? AND team_id='mens' AND player_id=? LIMIT 1").bind(body.seasonId, body.playerId).first<Row>();
  if (!exists) return Response.json({ error: "Spieler ist in dieser Saison nicht im Kader." }, { status: 404 });

  await DB.prepare(`UPDATE roster_memberships SET roster_status=?,availability=?,planning_status=?,starter=?,captain=?,updated_at=CURRENT_TIMESTAMP
    WHERE season_id=? AND team_id='mens' AND player_id=?`).bind(rosterStatus, availability, planningStatus, body.starter ? 1 : 0, body.captain ? 1 : 0, body.seasonId, body.playerId).run();
  return Response.json({ ok: true, updatedBy: actor.email });
}
