import { bindings } from "./cms";
import { ensureRosterFoundation } from "./roster";

async function tableColumns(table: string) {
  const { DB } = bindings();
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all<Record<string, unknown>>();
  return new Set(info.results.map((row) => String(row.name)));
}

export async function ensureGamedayRosterSchema() {
  await ensureRosterFoundation();
  const { DB } = bindings();

  const gameColumns = await tableColumns("games");
  if (!gameColumns.has("season_id")) {
    await DB.prepare("ALTER TABLE games ADD COLUMN season_id TEXT").run();
  }

  const depthColumns = await tableColumns("depth_chart_entries");
  if (!depthColumns.has("snapshot_id")) {
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
    DB.prepare(`CREATE TABLE IF NOT EXISTS gameday_roster_control (
      game_id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      team_id TEXT NOT NULL DEFAULT 'mens',
      status TEXT NOT NULL DEFAULT 'draft',
      source_depth_snapshot_id TEXT,
      locked_by TEXT NOT NULL DEFAULT '',
      locked_at TEXT,
      updated_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS gameday_roster_revisions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      revision_no INTEGER NOT NULL,
      label TEXT NOT NULL,
      source_depth_snapshot_id TEXT,
      locked_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_gameday_roster_revision_no ON gameday_roster_revisions(game_id,revision_no)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS gameday_roster_revision_entries (
      id TEXT PRIMARY KEY,
      revision_id TEXT NOT NULL,
      roster_membership_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      status TEXT NOT NULL,
      starter INTEGER NOT NULL DEFAULT 0,
      captain INTEGER NOT NULL DEFAULT 0,
      emergency INTEGER NOT NULL DEFAULT 0,
      special_teams_role TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_gameday_revision_entries ON gameday_roster_revision_entries(revision_id)`),
  ]);

  // Assign games to a season using kickoff year where possible, then fall back to the current season.
  await DB.prepare(`UPDATE games SET season_id=(
      SELECT s.id FROM seasons s WHERE s.year=CAST(substr(games.kickoff,1,4) AS INTEGER) LIMIT 1
    ) WHERE (season_id IS NULL OR season_id='') AND kickoff IS NOT NULL AND length(kickoff)>=4`).run();
  await DB.prepare(`UPDATE games SET season_id=(SELECT id FROM seasons WHERE is_current=1 ORDER BY year DESC LIMIT 1)
    WHERE season_id IS NULL OR season_id=''`).run();
}

export async function getGameSeason(gameId: string) {
  await ensureGamedayRosterSchema();
  const { DB } = bindings();
  return DB.prepare(`SELECT g.season_id,s.year,s.name
    FROM games g LEFT JOIN seasons s ON s.id=g.season_id WHERE g.id=? LIMIT 1`).bind(gameId)
    .first<{ season_id: string | null; year: number | null; name: string | null }>();
}

export async function getActiveGamedayPlayers(gameId: string) {
  await ensureGamedayRosterSchema();
  const { DB } = bindings();
  const rows = await DB.prepare(`SELECT ge.player_id AS id,p.first_name,p.last_name,rm.jersey_number,rm.primary_position AS position
    FROM gameday_roster_entries ge
    JOIN players p ON p.id=ge.player_id
    LEFT JOIN gameday_roster_control gc ON gc.game_id=ge.game_id
    LEFT JOIN roster_memberships rm ON rm.id=ge.roster_membership_id
    WHERE ge.game_id=? AND ge.status='active'
    ORDER BY ge.starter DESC,rm.primary_position,rm.jersey_number,p.last_name`).bind(gameId).all<Record<string, unknown>>();
  return rows.results.map((row) => ({
    id: String(row.id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
    position: String(row.position ?? ""),
  }));
}
