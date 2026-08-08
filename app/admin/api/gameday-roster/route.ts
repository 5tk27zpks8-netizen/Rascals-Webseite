import { bindings } from "../../../lib/cms";
import { ensureGamedayRosterSchema } from "../../../lib/gameday-roster";
import { requireCmsPermission } from "../../../lib/permissions";

type EntryInput = {
  rosterMembershipId: string;
  playerId: string;
  status: "active" | "inactive";
  starter: boolean;
  captain: boolean;
  emergency: boolean;
  specialTeamsRole: string;
};

type ActionBody = {
  action?: "initialize" | "save" | "lock" | "unlock";
  gameId?: string;
  entries?: EntryInput[];
};

async function gameInfo(gameId: string) {
  const { DB } = bindings();
  return DB.prepare(`SELECT g.id,g.opponent,g.opponent_logo,g.kickoff,g.status,g.season_id,s.year AS season_year,s.name AS season_name
    FROM games g LEFT JOIN seasons s ON s.id=g.season_id WHERE g.id=? LIMIT 1`).bind(gameId).first<Record<string, unknown>>();
}

function mapControl(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    gameId: String(row.game_id), seasonId: String(row.season_id), teamId: String(row.team_id ?? "mens"),
    status: String(row.status ?? "draft"), sourceDepthSnapshotId: row.source_depth_snapshot_id ? String(row.source_depth_snapshot_id) : null,
    lockedBy: String(row.locked_by ?? ""), lockedAt: row.locked_at ? String(row.locked_at) : null,
    updatedBy: String(row.updated_by ?? ""), updatedAt: String(row.updated_at ?? ""),
  };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureGamedayRosterSchema();
  const url = new URL(request.url);
  const { DB } = bindings();

  if (url.searchParams.get("base") === "1") {
    const info = await DB.prepare("PRAGMA table_info(games)").all<Record<string, unknown>>();
    const hasDeletedAt = info.results.some((row) => String(row.name) === "deleted_at");
    const where = hasDeletedAt ? "WHERE g.deleted_at IS NULL" : "";
    const games = await DB.prepare(`SELECT g.id,g.opponent,g.opponent_logo,g.kickoff,g.status,g.season_id,s.year AS season_year,s.name AS season_name,
        COALESCE(gc.status,'not-started') AS roster_status
      FROM games g LEFT JOIN seasons s ON s.id=g.season_id LEFT JOIN gameday_roster_control gc ON gc.game_id=g.id
      ${where}
      ORDER BY CASE g.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,COALESCE(g.kickoff,'9999-12-31')`).all<Record<string, unknown>>();
    return Response.json({ games: games.results.map((row) => ({
      id: String(row.id), opponent: String(row.opponent ?? ""), opponentLogo: String(row.opponent_logo ?? ""), kickoff: row.kickoff ? String(row.kickoff) : null,
      status: String(row.status ?? "upcoming"), seasonId: String(row.season_id ?? ""), seasonYear: row.season_year == null ? null : Number(row.season_year),
      seasonName: String(row.season_name ?? ""), rosterStatus: String(row.roster_status ?? "not-started"),
    })) });
  }

  const gameId = url.searchParams.get("game");
  if (!gameId) return Response.json({ error: "game fehlt." }, { status: 400 });
  const game = await gameInfo(gameId);
  if (!game) return Response.json({ error: "Spiel nicht gefunden." }, { status: 404 });
  const seasonId = String(game.season_id ?? "");
  if (!seasonId) return Response.json({ error: "Dem Spiel ist noch keine Saison zugeordnet." }, { status: 409 });

  const controlRow = await DB.prepare("SELECT * FROM gameday_roster_control WHERE game_id=? LIMIT 1").bind(gameId).first<Record<string, unknown>>();
  const entriesResult = await DB.prepare(`SELECT ge.*,p.first_name,p.last_name,p.portrait,rm.jersey_number,rm.primary_position,rm.secondary_position,rm.unit,rm.availability,rm.roster_status
    FROM gameday_roster_entries ge
    JOIN players p ON p.id=ge.player_id
    JOIN roster_memberships rm ON rm.id=ge.roster_membership_id
    WHERE ge.game_id=? ORDER BY ge.status DESC,rm.unit,rm.primary_position,rm.jersey_number,p.last_name`).bind(gameId).all<Record<string, unknown>>();

  const rosterResult = await DB.prepare(`SELECT rm.id AS roster_membership_id,rm.player_id,rm.jersey_number,rm.primary_position,rm.secondary_position,rm.unit,rm.availability,rm.roster_status,rm.captain,
      p.first_name,p.last_name,p.portrait
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND rm.roster_status NOT IN ('left','alumni') AND p.active=1
    ORDER BY rm.unit,rm.primary_position,rm.jersey_number,p.last_name`).bind(seasonId).all<Record<string, unknown>>();

  const depthSnapshot = await DB.prepare("SELECT id,label,created_at FROM depth_chart_snapshots WHERE season_id=? AND team_id='mens' AND is_current=1 ORDER BY created_at DESC LIMIT 1")
    .bind(seasonId).first<Record<string, unknown>>();
  const revisions = await DB.prepare("SELECT * FROM gameday_roster_revisions WHERE game_id=? ORDER BY revision_no DESC LIMIT 12").bind(gameId).all<Record<string, unknown>>();

  return Response.json({
    game: { id: String(game.id), opponent: String(game.opponent ?? ""), opponentLogo: String(game.opponent_logo ?? ""), kickoff: game.kickoff ? String(game.kickoff) : null, status: String(game.status ?? "upcoming"), seasonId, seasonYear: game.season_year == null ? null : Number(game.season_year), seasonName: String(game.season_name ?? "") },
    control: mapControl(controlRow ?? null),
    currentDepthSnapshot: depthSnapshot ? { id: String(depthSnapshot.id), label: String(depthSnapshot.label ?? "Depth Chart"), createdAt: String(depthSnapshot.created_at ?? "") } : null,
    roster: rosterResult.results.map((row) => ({
      rosterMembershipId: String(row.roster_membership_id), playerId: String(row.player_id), jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
      firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""), portrait: String(row.portrait ?? ""),
      primaryPosition: String(row.primary_position ?? ""), secondaryPosition: String(row.secondary_position ?? ""), unit: String(row.unit ?? "defense"),
      availability: String(row.availability ?? "full"), rosterStatus: String(row.roster_status ?? "active"), captain: Number(row.captain ?? 0) === 1,
    })),
    entries: entriesResult.results.map((row) => ({
      id: String(row.id), rosterMembershipId: String(row.roster_membership_id), playerId: String(row.player_id), status: String(row.status ?? "active"),
      starter: Number(row.starter ?? 0) === 1, captain: Number(row.captain ?? 0) === 1, emergency: Number(row.emergency ?? 0) === 1,
      specialTeamsRole: String(row.special_teams_role ?? ""), firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""), portrait: String(row.portrait ?? ""),
      jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number), primaryPosition: String(row.primary_position ?? ""), secondaryPosition: String(row.secondary_position ?? ""),
      unit: String(row.unit ?? "defense"), availability: String(row.availability ?? "full"), rosterStatus: String(row.roster_status ?? "active"),
    })),
    revisions: revisions.results.map((row) => ({ id: String(row.id), revisionNo: Number(row.revision_no), label: String(row.label ?? ""), sourceDepthSnapshotId: row.source_depth_snapshot_id ? String(row.source_depth_snapshot_id) : null, lockedBy: String(row.locked_by ?? ""), createdAt: String(row.created_at ?? "") })),
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureGamedayRosterSchema();
  const body = await request.json() as ActionBody;
  if (!body.gameId) return Response.json({ error: "Spiel ist erforderlich." }, { status: 400 });
  const { DB } = bindings();
  const game = await gameInfo(body.gameId);
  if (!game) return Response.json({ error: "Spiel nicht gefunden." }, { status: 404 });
  const seasonId = String(game.season_id ?? "");
  if (!seasonId) return Response.json({ error: "Dem Spiel ist noch keine Saison zugeordnet." }, { status: 409 });
  const currentControl = await DB.prepare("SELECT * FROM gameday_roster_control WHERE game_id=? LIMIT 1").bind(body.gameId).first<Record<string, unknown>>();

  if (body.action === "initialize") {
    if (String(currentControl?.status ?? "") === "locked") return Response.json({ error: "Der Gameday-Roster ist gesperrt. Vor einer Neuinitialisierung zuerst entsperren." }, { status: 423 });
    const members = await DB.prepare(`SELECT rm.id,rm.player_id,rm.availability,rm.roster_status,rm.captain
      FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
      WHERE rm.season_id=? AND rm.team_id='mens' AND rm.roster_status NOT IN ('left','alumni') AND p.active=1`).bind(seasonId).all<Record<string, unknown>>();
    const depthSnapshot = await DB.prepare("SELECT id FROM depth_chart_snapshots WHERE season_id=? AND team_id='mens' AND is_current=1 ORDER BY created_at DESC LIMIT 1").bind(seasonId).first<{ id: string }>();
    const depth = depthSnapshot ? await DB.prepare("SELECT player_id,position,rank FROM depth_chart_entries WHERE snapshot_id=?").bind(depthSnapshot.id).all<Record<string, unknown>>() : { results: [] as Record<string, unknown>[] };
    const starterIds = new Set(depth.results.filter((row) => Number(row.rank) === 1).map((row) => String(row.player_id)));
    const stRoles = new Map<string,string[]>();
    const specialSlots = new Set(["K","P","LS","HOLDER","KR","PR","GUNNER L","GUNNER R"]);
    for (const row of depth.results) {
      if (Number(row.rank) !== 1 || !specialSlots.has(String(row.position))) continue;
      const key = String(row.player_id); const list = stRoles.get(key) ?? []; list.push(String(row.position)); stRoles.set(key,list);
    }
    const statements = [
      DB.prepare("DELETE FROM gameday_roster_entries WHERE game_id=?").bind(body.gameId),
      DB.prepare(`INSERT INTO gameday_roster_control (game_id,season_id,team_id,status,source_depth_snapshot_id,locked_by,locked_at,updated_by,updated_at)
        VALUES (?,?,'mens','draft',?,'',NULL,?,CURRENT_TIMESTAMP)
        ON CONFLICT(game_id) DO UPDATE SET season_id=excluded.season_id,status='draft',source_depth_snapshot_id=excluded.source_depth_snapshot_id,locked_by='',locked_at=NULL,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
        .bind(body.gameId, seasonId, depthSnapshot?.id ?? null, actor.email),
      ...members.results.map((row) => {
        const playerId = String(row.player_id);
        const inactive = String(row.availability) === "out" || ["injured","suspended"].includes(String(row.roster_status));
        return DB.prepare(`INSERT INTO gameday_roster_entries (id,game_id,roster_membership_id,player_id,status,starter,captain,emergency,special_teams_role)
          VALUES (?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), body.gameId, String(row.id), playerId, inactive ? "inactive" : "active", starterIds.has(playerId) ? 1 : 0, Number(row.captain ?? 0), 0, (stRoles.get(playerId) ?? []).join(", "));
      }),
    ];
    await DB.batch(statements);
    return Response.json({ ok: true, count: members.results.length, sourceDepthSnapshotId: depthSnapshot?.id ?? null });
  }

  if (body.action === "save") {
    if (!currentControl) return Response.json({ error: "Roster zuerst aus dem Saisonkader initialisieren." }, { status: 409 });
    if (String(currentControl.status) === "locked") return Response.json({ error: "Der Gameday-Roster ist gesperrt und kann nicht bearbeitet werden." }, { status: 423 });
    const entries = body.entries ?? [];
    const validPlayers = await DB.prepare("SELECT id,player_id FROM roster_memberships WHERE season_id=? AND team_id='mens'").bind(seasonId).all<{ id: string; player_id: string }>();
    const valid = new Map(validPlayers.results.map((row) => [String(row.player_id), String(row.id)]));
    for (const entry of entries) {
      if (!valid.has(entry.playerId) || valid.get(entry.playerId) !== entry.rosterMembershipId) return Response.json({ error: "Mindestens ein Eintrag gehört nicht zum Saisonkader." }, { status: 409 });
      if (!["active","inactive"].includes(entry.status)) return Response.json({ error: "Ungültiger Gameday-Status." }, { status: 400 });
    }
    const statements = [DB.prepare("DELETE FROM gameday_roster_entries WHERE game_id=?").bind(body.gameId),
      ...entries.map((entry) => DB.prepare(`INSERT INTO gameday_roster_entries (id,game_id,roster_membership_id,player_id,status,starter,captain,emergency,special_teams_role)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), body.gameId, entry.rosterMembershipId, entry.playerId, entry.status, entry.starter ? 1 : 0, entry.captain ? 1 : 0, entry.emergency ? 1 : 0, entry.specialTeamsRole?.trim() ?? "")),
      DB.prepare("UPDATE gameday_roster_control SET updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE game_id=?").bind(actor.email, body.gameId)];
    await DB.batch(statements);
    return Response.json({ ok: true, count: entries.length });
  }

  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureGamedayRosterSchema();
  const body = await request.json() as ActionBody;
  if (!body.gameId || !body.action) return Response.json({ error: "Spiel und Aktion sind erforderlich." }, { status: 400 });
  const { DB } = bindings();
  const control = await DB.prepare("SELECT * FROM gameday_roster_control WHERE game_id=? LIMIT 1").bind(body.gameId).first<Record<string, unknown>>();
  if (!control) return Response.json({ error: "Gameday-Roster wurde noch nicht initialisiert." }, { status: 409 });

  if (body.action === "unlock") {
    await DB.prepare("UPDATE gameday_roster_control SET status='draft',locked_by='',locked_at=NULL,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE game_id=?").bind(actor.email, body.gameId).run();
    return Response.json({ ok: true, status: "draft" });
  }

  if (body.action === "lock") {
    if (String(control.status) === "locked") return Response.json({ error: "Gameday-Roster ist bereits gesperrt." }, { status: 409 });
    const entries = await DB.prepare("SELECT * FROM gameday_roster_entries WHERE game_id=? ORDER BY player_id").bind(body.gameId).all<Record<string, unknown>>();
    if (!entries.results.length) return Response.json({ error: "Ein leerer Gameday-Roster kann nicht gesperrt werden." }, { status: 409 });
    const activeCount = entries.results.filter((row) => String(row.status) === "active").length;
    if (!activeCount) return Response.json({ error: "Mindestens ein Spieler muss aktiv sein." }, { status: 409 });
    const next = await DB.prepare("SELECT COALESCE(MAX(revision_no),0)+1 AS next_no FROM gameday_roster_revisions WHERE game_id=?").bind(body.gameId).first<{ next_no: number }>();
    const revisionNo = Number(next?.next_no ?? 1);
    const revisionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const label = `Locked Roster · Revision ${revisionNo}`;
    await DB.batch([
      DB.prepare(`INSERT INTO gameday_roster_revisions (id,game_id,revision_no,label,source_depth_snapshot_id,locked_by,created_at) VALUES (?,?,?,?,?,?,?)`)
        .bind(revisionId, body.gameId, revisionNo, label, control.source_depth_snapshot_id ?? null, actor.email, now),
      ...entries.results.map((row) => DB.prepare(`INSERT INTO gameday_roster_revision_entries (id,revision_id,roster_membership_id,player_id,status,starter,captain,emergency,special_teams_role,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), revisionId, String(row.roster_membership_id), String(row.player_id), String(row.status), Number(row.starter ?? 0), Number(row.captain ?? 0), Number(row.emergency ?? 0), String(row.special_teams_role ?? ""), now)),
      DB.prepare("UPDATE gameday_roster_control SET status='locked',locked_by=?,locked_at=?,updated_by=?,updated_at=? WHERE game_id=?").bind(actor.email, now, actor.email, now, body.gameId),
    ]);
    return Response.json({ ok: true, status: "locked", revisionId, revisionNo, activeCount });
  }

  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
