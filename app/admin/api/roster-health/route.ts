import { bindings } from "../../../lib/cms";
import { ensureGamedayRosterSchema } from "../../../lib/gameday-roster";
import { requireCmsPermission } from "../../../lib/permissions";

const POSITION_GROUPS = [
  { key: "QB", label: "Quarterback", positions: ["QB"] },
  { key: "BACKFIELD", label: "Backfield", positions: ["RB", "FB"] },
  { key: "RECEIVERS", label: "Receiver / TE", positions: ["WR", "TE"] },
  { key: "OL", label: "Offensive Line", positions: ["OL", "C", "G", "T"] },
  { key: "DL", label: "Defensive Line", positions: ["DL", "DE", "DT", "NT"] },
  { key: "LB", label: "Linebacker", positions: ["LB", "MLB", "ILB", "OLB"] },
  { key: "DB", label: "Defensive Backs", positions: ["DB", "CB", "FS", "SS"] },
  { key: "SPECIALISTS", label: "Specialists", positions: ["K", "P", "LS", "KR", "PR"] },
] as const;

const EXPECTED_DEPTH_SLOTS = [
  "QB","RB","FB","X WR","Z WR","SLOT","TE","LT","LG","C","RG","RT",
  "LDE","DT","NT","RDE","WILL","MIKE","SAM","CB1","CB2","NICKEL","FS","SS",
  "K","P","LS","HOLDER","KR","PR","GUNNER L","GUNNER R",
] as const;

async function ensureHealthSchema() {
  await ensureGamedayRosterSchema();
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS roster_position_targets (
    season_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    position_group TEXT NOT NULL,
    target_count INTEGER NOT NULL DEFAULT 0,
    minimum_ready INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (season_id, team_id, position_group)
  )`).run();
}

function groupForPosition(position: string) {
  const normalized = position.trim().toUpperCase();
  return POSITION_GROUPS.find((group) => (group.positions as readonly string[]).includes(normalized))?.key ?? "OTHER";
}

function seasonMap(row: Record<string, unknown>) {
  return { id: String(row.id), year: Number(row.year), name: String(row.name ?? ""), isCurrent: Number(row.is_current ?? 0) === 1 };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureHealthSchema();
  const { DB } = bindings();
  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId") || "mens";

  const seasonsResult = await DB.prepare("SELECT id,year,name,is_current FROM seasons ORDER BY year DESC").all<Record<string, unknown>>();
  const seasons = seasonsResult.results.map(seasonMap);
  const requestedSeason = url.searchParams.get("seasonId");
  const season = seasons.find((item) => item.id === requestedSeason) ?? seasons.find((item) => item.isCurrent) ?? seasons[0];
  if (!season) return Response.json({ error: "Keine Saison vorhanden." }, { status: 404 });

  const rosterResult = await DB.prepare(`SELECT rm.*,p.first_name,p.last_name,p.portrait
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id=? AND rm.roster_status NOT IN ('left','alumni') AND p.active=1
    ORDER BY rm.unit,rm.primary_position,rm.jersey_number,p.last_name`).bind(season.id, teamId).all<Record<string, unknown>>();
  const roster = rosterResult.results;

  const targetsResult = await DB.prepare("SELECT * FROM roster_position_targets WHERE season_id=? AND team_id=?")
    .bind(season.id, teamId).all<Record<string, unknown>>();
  const targets = new Map(targetsResult.results.map((row) => [String(row.position_group), row]));

  const active = roster.filter((row) => String(row.roster_status) === "active");
  const gameReady = active.filter((row) => String(row.availability) === "full");
  const limited = active.filter((row) => ["limited", "questionable", "return-to-play"].includes(String(row.availability)));
  const out = roster.filter((row) => String(row.availability) === "out" || ["injured", "suspended"].includes(String(row.roster_status)));
  const planning = (status: string) => roster.filter((row) => String(row.planning_status ?? "unknown") === status).length;

  const positionGroups = [...POSITION_GROUPS.map((group) => ({ key: group.key, label: group.label })), { key: "OTHER", label: "Other" }].map((group) => {
    const members = roster.filter((row) => groupForPosition(String(row.primary_position ?? "")) === group.key);
    const target = targets.get(group.key);
    const total = members.length;
    const activeCount = members.filter((row) => String(row.roster_status) === "active").length;
    const readyCount = members.filter((row) => String(row.roster_status) === "active" && String(row.availability) === "full").length;
    const targetCount = target ? Number(target.target_count ?? 0) : null;
    const minimumReady = target ? Number(target.minimum_ready ?? 0) : null;
    return {
      key: group.key,
      label: group.label,
      total,
      active: activeCount,
      gameReady: readyCount,
      limited: members.filter((row) => ["limited", "questionable", "return-to-play"].includes(String(row.availability))).length,
      out: members.filter((row) => String(row.availability) === "out" || ["injured", "suspended"].includes(String(row.roster_status))).length,
      rookies: members.filter((row) => Number(row.rookie ?? 0) === 1).length,
      returning: members.filter((row) => String(row.planning_status ?? "unknown") === "returning").length,
      unsure: members.filter((row) => String(row.planning_status ?? "unknown") === "unsure").length,
      leaving: members.filter((row) => String(row.planning_status ?? "unknown") === "leaving").length,
      configured: Boolean(target),
      targetCount,
      minimumReady,
      gap: targetCount == null ? null : Math.max(0, targetCount - total),
      readyGap: minimumReady == null ? null : Math.max(0, minimumReady - readyCount),
    };
  });

  const depthSnapshot = await DB.prepare("SELECT id,label,created_at FROM depth_chart_snapshots WHERE season_id=? AND team_id=? AND is_current=1 ORDER BY created_at DESC LIMIT 1")
    .bind(season.id, teamId).first<Record<string, unknown>>();
  let depthEntries: Record<string, unknown>[] = [];
  if (depthSnapshot) {
    const result = await DB.prepare(`SELECT d.position,d.rank,d.player_id,p.first_name,p.last_name,rm.jersey_number,rm.availability,rm.roster_status
      FROM depth_chart_entries d JOIN players p ON p.id=d.player_id
      LEFT JOIN roster_memberships rm ON rm.player_id=d.player_id AND rm.season_id=d.season_id AND rm.team_id=d.team_id
      WHERE d.snapshot_id=? ORDER BY d.position,d.rank`).bind(String(depthSnapshot.id)).all<Record<string, unknown>>();
    depthEntries = result.results;
  }
  const missingStarters = depthSnapshot ? EXPECTED_DEPTH_SLOTS.filter((slot) => !depthEntries.some((row) => String(row.position) === slot && Number(row.rank) === 1)) : [];
  const missingBackups = depthSnapshot ? EXPECTED_DEPTH_SLOTS.filter((slot) => !depthEntries.some((row) => String(row.position) === slot && Number(row.rank) === 2)) : [];
  const starterRisks = depthEntries.filter((row) => Number(row.rank) === 1 && (String(row.availability ?? "full") !== "full" || String(row.roster_status ?? "active") !== "active")).map((row) => ({
    slot: String(row.position), playerId: String(row.player_id), firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""), jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number), availability: String(row.availability ?? "full"), rosterStatus: String(row.roster_status ?? "active"),
  }));

  const gameColumns = await DB.prepare("PRAGMA table_info(games)").all<Record<string, unknown>>();
  const hasDeletedAt = gameColumns.results.some((row) => String(row.name) === "deleted_at");
  const gameWhere = hasDeletedAt ? "AND g.deleted_at IS NULL" : "";
  const nextGameRow = await DB.prepare(`SELECT g.id,g.opponent,g.kickoff,g.status,COALESCE(gc.status,'not-started') AS roster_status,gc.locked_at
    FROM games g LEFT JOIN gameday_roster_control gc ON gc.game_id=g.id
    WHERE g.season_id=? AND g.status IN ('live','upcoming') ${gameWhere}
    ORDER BY CASE g.status WHEN 'live' THEN 0 ELSE 1 END,COALESCE(g.kickoff,'9999-12-31') LIMIT 1`).bind(season.id).first<Record<string, unknown>>();
  let nextGame = null as null | Record<string, unknown>;
  if (nextGameRow) {
    const counts = await DB.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) AS active_count,SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) AS inactive_count
      FROM gameday_roster_entries WHERE game_id=?`).bind(String(nextGameRow.id)).first<Record<string, unknown>>();
    nextGame = {
      id: String(nextGameRow.id), opponent: String(nextGameRow.opponent ?? ""), kickoff: nextGameRow.kickoff ? String(nextGameRow.kickoff) : null,
      status: String(nextGameRow.status ?? "upcoming"), rosterStatus: String(nextGameRow.roster_status ?? "not-started"), lockedAt: nextGameRow.locked_at ? String(nextGameRow.locked_at) : null,
      total: Number(counts?.total ?? 0), active: Number(counts?.active_count ?? 0), inactive: Number(counts?.inactive_count ?? 0),
    };
  }

  return Response.json({
    seasons,
    season,
    summary: {
      total: roster.length,
      active: active.length,
      gameReady: gameReady.length,
      available: active.filter((row) => String(row.availability) !== "out").length,
      limited: limited.length,
      out: out.length,
      rookies: roster.filter((row) => Number(row.rookie ?? 0) === 1).length,
      nonRookies: roster.filter((row) => Number(row.rookie ?? 0) !== 1).length,
      captains: roster.filter((row) => Number(row.captain ?? 0) === 1).length,
      returning: planning("returning"), unsure: planning("unsure"), leaving: planning("leaving"), unknown: planning("unknown"),
    },
    positionGroups,
    depth: {
      snapshot: depthSnapshot ? { id: String(depthSnapshot.id), label: String(depthSnapshot.label ?? "Depth Chart"), createdAt: String(depthSnapshot.created_at ?? "") } : null,
      expectedSlots: EXPECTED_DEPTH_SLOTS.length,
      startersAssigned: EXPECTED_DEPTH_SLOTS.length - missingStarters.length,
      backupsAssigned: EXPECTED_DEPTH_SLOTS.length - missingBackups.length,
      missingStarters,
      missingBackups,
      starterRisks,
    },
    nextGame,
  });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureHealthSchema();
  const body = await request.json() as { seasonId?: string; teamId?: string; targets?: { positionGroup?: string; targetCount?: number; minimumReady?: number }[] };
  if (!body.seasonId) return Response.json({ error: "Saison ist erforderlich." }, { status: 400 });
  const teamId = body.teamId?.trim() || "mens";
  const allowed = new Set<string>([...POSITION_GROUPS.map((group) => group.key), "OTHER"]);
  const targets = body.targets ?? [];
  for (const target of targets) {
    if (!target.positionGroup || !allowed.has(target.positionGroup)) return Response.json({ error: "Ungültige Positionsgruppe." }, { status: 400 });
    if (!Number.isInteger(target.targetCount) || Number(target.targetCount) < 0 || Number(target.targetCount) > 99) return Response.json({ error: "Ziel-Kaderstärke muss zwischen 0 und 99 liegen." }, { status: 400 });
    if (!Number.isInteger(target.minimumReady) || Number(target.minimumReady) < 0 || Number(target.minimumReady) > Number(target.targetCount)) return Response.json({ error: "Minimum Game Ready muss zwischen 0 und Ziel-Kaderstärke liegen." }, { status: 400 });
  }
  if (!targets.length) return Response.json({ ok: true, updated: 0 });
  const { DB } = bindings();
  await DB.batch(targets.map((target) => DB.prepare(`INSERT INTO roster_position_targets (season_id,team_id,position_group,target_count,minimum_ready,updated_by,updated_at)
    VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(season_id,team_id,position_group) DO UPDATE SET target_count=excluded.target_count,minimum_ready=excluded.minimum_ready,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
    .bind(body.seasonId, teamId, target.positionGroup!, Number(target.targetCount), Number(target.minimumReady), actor.email)));
  return Response.json({ ok: true, updated: targets.length });
}
