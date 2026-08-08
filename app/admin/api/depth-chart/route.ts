import { bindings } from "../../../lib/cms";
import { requireCmsPermission } from "../../../lib/permissions";
import { ensureRosterFoundation } from "../../../lib/roster";

type DepthEntryInput = {
  positionGroup: string;
  position: string;
  playerId: string;
  rank: number;
};

type DepthSnapshot = {
  id: string;
  seasonId: string;
  teamId: string;
  label: string;
  isCurrent: boolean;
  createdBy: string;
  createdAt: string;
};

async function ensureDepthChartSchema() {
  await ensureRosterFoundation();
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(depth_chart_entries)").all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === "snapshot_id")) {
    await DB.prepare("ALTER TABLE depth_chart_entries ADD COLUMN snapshot_id TEXT").run();
  }
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS depth_chart_snapshots (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      label TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_depth_snapshots_lookup ON depth_chart_snapshots(season_id,team_id,created_at)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_depth_entries_snapshot ON depth_chart_entries(snapshot_id,position,rank)"),
  ]);
}

function mapSnapshot(row: Record<string, unknown>): DepthSnapshot {
  return {
    id: String(row.id),
    seasonId: String(row.season_id),
    teamId: String(row.team_id),
    label: String(row.label ?? "Depth Chart"),
    isCurrent: Number(row.is_current ?? 0) === 1,
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureDepthChartSchema();

  const url = new URL(request.url);
  const seasonId = url.searchParams.get("seasonId") || "season-2026";
  const teamId = url.searchParams.get("teamId") || "mens";
  const requestedSnapshotId = url.searchParams.get("snapshotId");
  const { DB } = bindings();

  const snapshotsResult = await DB.prepare(`SELECT * FROM depth_chart_snapshots
    WHERE season_id=? AND team_id=? ORDER BY created_at DESC LIMIT 40`).bind(seasonId, teamId).all<Record<string, unknown>>();
  const snapshots = snapshotsResult.results.map(mapSnapshot);

  let snapshot: DepthSnapshot | null = null;
  if (requestedSnapshotId) {
    const row = await DB.prepare("SELECT * FROM depth_chart_snapshots WHERE id=? AND season_id=? AND team_id=? LIMIT 1")
      .bind(requestedSnapshotId, seasonId, teamId).first<Record<string, unknown>>();
    snapshot = row ? mapSnapshot(row) : null;
  } else {
    snapshot = snapshots.find((item) => item.isCurrent) ?? snapshots[0] ?? null;
  }

  const rosterResult = await DB.prepare(`SELECT rm.player_id,rm.jersey_number,rm.primary_position,rm.secondary_position,rm.unit,rm.roster_status,rm.availability,
      p.first_name,p.last_name,p.portrait
    FROM roster_memberships rm
    JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id=? AND rm.roster_status NOT IN ('left','alumni') AND p.active=1
    ORDER BY rm.unit,rm.primary_position,rm.jersey_number,p.last_name`).bind(seasonId, teamId).all<Record<string, unknown>>();

  const roster = rosterResult.results.map((row) => ({
    playerId: String(row.player_id),
    jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    portrait: String(row.portrait ?? ""),
    primaryPosition: String(row.primary_position ?? ""),
    secondaryPosition: String(row.secondary_position ?? ""),
    unit: String(row.unit ?? "defense"),
    rosterStatus: String(row.roster_status ?? "active"),
    availability: String(row.availability ?? "full"),
  }));

  let entries: Record<string, unknown>[] = [];
  if (snapshot) {
    const entryResult = await DB.prepare(`SELECT d.*,p.first_name,p.last_name,p.portrait,rm.jersey_number,rm.availability,rm.primary_position
      FROM depth_chart_entries d
      JOIN players p ON p.id=d.player_id
      LEFT JOIN roster_memberships rm ON rm.player_id=d.player_id AND rm.season_id=d.season_id AND rm.team_id=d.team_id
      WHERE d.snapshot_id=? ORDER BY d.position_group,d.position,d.rank`).bind(snapshot.id).all<Record<string, unknown>>();
    entries = entryResult.results;
  } else {
    const legacyResult = await DB.prepare(`SELECT d.*,p.first_name,p.last_name,p.portrait,rm.jersey_number,rm.availability,rm.primary_position
      FROM depth_chart_entries d
      JOIN players p ON p.id=d.player_id
      LEFT JOIN roster_memberships rm ON rm.player_id=d.player_id AND rm.season_id=d.season_id AND rm.team_id=d.team_id
      WHERE d.season_id=? AND d.team_id=? AND d.valid_to IS NULL AND d.snapshot_id IS NULL
      ORDER BY d.position_group,d.position,d.rank`).bind(seasonId, teamId).all<Record<string, unknown>>();
    entries = legacyResult.results;
  }

  return Response.json({
    seasonId,
    teamId,
    snapshot,
    snapshots,
    roster,
    entries: entries.map((row) => ({
      id: String(row.id),
      snapshotId: row.snapshot_id ? String(row.snapshot_id) : null,
      positionGroup: String(row.position_group ?? ""),
      position: String(row.position ?? ""),
      playerId: String(row.player_id),
      rank: Number(row.rank ?? 1),
      firstName: String(row.first_name ?? ""),
      lastName: String(row.last_name ?? ""),
      portrait: String(row.portrait ?? ""),
      jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
      availability: String(row.availability ?? "full"),
      primaryPosition: String(row.primary_position ?? ""),
    })),
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("roster");
  if (actor instanceof Response) return actor;
  await ensureDepthChartSchema();

  const body = await request.json() as {
    seasonId?: string;
    teamId?: string;
    label?: string;
    entries?: DepthEntryInput[];
  };
  const seasonId = body.seasonId?.trim();
  const teamId = body.teamId?.trim() || "mens";
  if (!seasonId) return Response.json({ error: "Saison ist erforderlich." }, { status: 400 });

  const normalized = (body.entries ?? [])
    .filter((entry) => entry.playerId?.trim() && entry.position?.trim())
    .map((entry) => ({
      positionGroup: entry.positionGroup?.trim() || "OTHER",
      position: entry.position.trim(),
      playerId: entry.playerId.trim(),
      rank: Number(entry.rank),
    }));

  const slotKeys = new Set<string>();
  const playerPositionKeys = new Set<string>();
  for (const entry of normalized) {
    if (!Number.isInteger(entry.rank) || entry.rank < 1 || entry.rank > 5) {
      return Response.json({ error: "Depth-Rang muss zwischen 1 und 5 liegen." }, { status: 400 });
    }
    const slotKey = `${entry.position}|${entry.rank}`;
    if (slotKeys.has(slotKey)) return Response.json({ error: `Position ${entry.position} hat Rang ${entry.rank} mehrfach belegt.` }, { status: 409 });
    slotKeys.add(slotKey);
    const playerKey = `${entry.position}|${entry.playerId}`;
    if (playerPositionKeys.has(playerKey)) return Response.json({ error: `Ein Spieler kann innerhalb von ${entry.position} nur einmal geführt werden.` }, { status: 409 });
    playerPositionKeys.add(playerKey);
  }

  const { DB } = bindings();
  const season = await DB.prepare("SELECT id FROM seasons WHERE id=? LIMIT 1").bind(seasonId).first<{ id: string }>();
  if (!season) return Response.json({ error: "Saison wurde nicht gefunden." }, { status: 404 });

  const rosterResult = await DB.prepare(`SELECT player_id FROM roster_memberships
    WHERE season_id=? AND team_id=? AND roster_status NOT IN ('left','alumni')`).bind(seasonId, teamId).all<{ player_id: string }>();
  const eligiblePlayers = new Set(rosterResult.results.map((row) => String(row.player_id)));
  for (const entry of normalized) {
    if (!eligiblePlayers.has(entry.playerId)) {
      return Response.json({ error: "Mindestens ein ausgewählter Spieler gehört nicht zum aktiven Saisonkader." }, { status: 409 });
    }
  }

  const snapshotId = crypto.randomUUID();
  const now = new Date().toISOString();
  const label = body.label?.trim() || `Depth Chart ${new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date())}`;

  const statements = [
    DB.prepare("UPDATE depth_chart_snapshots SET is_current=0 WHERE season_id=? AND team_id=? AND is_current=1").bind(seasonId, teamId),
    DB.prepare("UPDATE depth_chart_entries SET valid_to=?,updated_at=? WHERE season_id=? AND team_id=? AND valid_to IS NULL").bind(now, now, seasonId, teamId),
    DB.prepare(`INSERT INTO depth_chart_snapshots (id,season_id,team_id,label,is_current,created_by,created_at)
      VALUES (?,?,?,?,1,?,?)`).bind(snapshotId, seasonId, teamId, label, actor.email, now),
    ...normalized.map((entry) => DB.prepare(`INSERT INTO depth_chart_entries
      (id,season_id,team_id,position_group,position,player_id,rank,valid_from,valid_to,created_at,updated_at,snapshot_id)
      VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?)`).bind(
        crypto.randomUUID(), seasonId, teamId, entry.positionGroup, entry.position, entry.playerId, entry.rank, now, now, now, snapshotId,
      )),
  ];

  await DB.batch(statements);
  return Response.json({
    snapshot: { id: snapshotId, seasonId, teamId, label, isCurrent: true, createdBy: actor.email, createdAt: now },
    entryCount: normalized.length,
  }, { status: 201 });
}
