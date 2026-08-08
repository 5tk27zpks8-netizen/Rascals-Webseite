import { bindings } from "./cms";
import { ensureFootballSchema } from "./football";

export type SeasonStatus = "planning" | "active" | "completed" | "archived";
export type RosterStatus = "active" | "practice-squad" | "reserve" | "injured" | "suspended" | "left" | "alumni";
export type AvailabilityStatus = "full" | "limited" | "questionable" | "out" | "return-to-play";
export type PlanningStatus = "unknown" | "returning" | "unsure" | "leaving";

export type Season = {
  id: string;
  year: number;
  name: string;
  status: SeasonStatus;
  startsAt: string | null;
  endsAt: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RosterMembership = {
  id: string;
  seasonId: string;
  teamId: string;
  playerId: string;
  jerseyNumber: number | null;
  primaryPosition: string;
  secondaryPosition: string;
  unit: "offense" | "defense" | "special-teams";
  rosterStatus: RosterStatus;
  availability: AvailabilityStatus;
  planningStatus: PlanningStatus;
  starter: boolean;
  captain: boolean;
  rookie: boolean;
  leadershipRole: string;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
};

async function tableColumns(table: string) {
  const { DB } = bindings();
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all<Record<string, unknown>>();
  return new Set(info.results.map((row) => String(row.name)));
}

async function ensureColumn(table: string, column: string, definition: string) {
  const { DB } = bindings();
  const columns = await tableColumns(table);
  if (!columns.has(column)) await DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

export async function ensureRosterFoundation() {
  await ensureFootballSchema();
  const { DB } = bindings();

  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      year INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'planning',
      starts_at TEXT,
      ends_at TEXT,
      is_current INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS roster_memberships (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      jersey_number INTEGER,
      primary_position TEXT NOT NULL DEFAULT '',
      secondary_position TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'defense',
      roster_status TEXT NOT NULL DEFAULT 'active',
      availability TEXT NOT NULL DEFAULT 'full',
      planning_status TEXT NOT NULL DEFAULT 'unknown',
      starter INTEGER NOT NULL DEFAULT 0,
      captain INTEGER NOT NULL DEFAULT 0,
      rookie INTEGER NOT NULL DEFAULT 0,
      leadership_role TEXT NOT NULL DEFAULT '',
      joined_at TEXT,
      left_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_membership_unique ON roster_memberships(season_id,team_id,player_id)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_roster_membership_season_team ON roster_memberships(season_id,team_id)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_roster_membership_position ON roster_memberships(season_id,team_id,primary_position)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS depth_chart_entries (
      id TEXT PRIMARY KEY,
      season_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      position_group TEXT NOT NULL,
      position TEXT NOT NULL,
      player_id TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1,
      valid_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      valid_to TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_depth_chart_current ON depth_chart_entries(season_id,team_id,position,valid_to,rank)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS gameday_roster_entries (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      roster_membership_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      starter INTEGER NOT NULL DEFAULT 0,
      captain INTEGER NOT NULL DEFAULT 0,
      emergency INTEGER NOT NULL DEFAULT 0,
      special_teams_role TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_gameday_roster_unique ON gameday_roster_entries(game_id,player_id)`),
  ]);

  await ensureColumn("roster_memberships", "planning_status", "TEXT NOT NULL DEFAULT 'unknown'");

  await DB.prepare(`INSERT OR IGNORE INTO seasons (id,year,name,status,is_current)
    VALUES ('season-2026',2026,'Saison 2026','active',1)`).run();

  const current = await DB.prepare("SELECT id FROM seasons WHERE is_current=1 ORDER BY year DESC LIMIT 1").first<{ id: string }>();
  const seasonId = current?.id ?? "season-2026";

  const playerCols = await tableColumns("players");
  const deletedFilter = playerCols.has("deleted_at") ? "WHERE deleted_at IS NULL" : "";
  await DB.prepare(`INSERT OR IGNORE INTO roster_memberships (
      id,season_id,team_id,player_id,jersey_number,primary_position,secondary_position,unit,roster_status,availability,starter,captain,rookie,joined_at
    )
    SELECT 'rm-' || id, ?, COALESCE(NULLIF(team_id,''),'mens'), id, jersey_number, position, secondary_position, unit,
      CASE WHEN active=1 THEN 'active' ELSE 'reserve' END,
      CASE status WHEN 'questionable' THEN 'questionable' WHEN 'out' THEN 'out' WHEN 'ir' THEN 'out' ELSE 'full' END,
      starter,captain,rookie,
      CASE WHEN joined_year IS NOT NULL THEN CAST(joined_year AS TEXT) || '-01-01' ELSE NULL END
    FROM players ${deletedFilter}`).bind(seasonId).run();
}

export function mapSeason(row: Record<string, unknown>): Season {
  const raw = String(row.status ?? "planning");
  const status: SeasonStatus = ["active", "completed", "archived"].includes(raw) ? raw as SeasonStatus : "planning";
  return {
    id: String(row.id), year: Number(row.year), name: String(row.name ?? ""), status,
    startsAt: row.starts_at ? String(row.starts_at) : null, endsAt: row.ends_at ? String(row.ends_at) : null,
    isCurrent: Number(row.is_current ?? 0) === 1, createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  };
}

export function mapRosterMembership(row: Record<string, unknown>): RosterMembership {
  const rawUnit = String(row.unit ?? "defense");
  const unit = ["offense", "special-teams"].includes(rawUnit) ? rawUnit as RosterMembership["unit"] : "defense";
  const rawRosterStatus = String(row.roster_status ?? "active");
  const rosterStatus: RosterStatus = ["practice-squad", "reserve", "injured", "suspended", "left", "alumni"].includes(rawRosterStatus) ? rawRosterStatus as RosterStatus : "active";
  const rawAvailability = String(row.availability ?? "full");
  const availability: AvailabilityStatus = ["limited", "questionable", "out", "return-to-play"].includes(rawAvailability) ? rawAvailability as AvailabilityStatus : "full";
  const rawPlanning = String(row.planning_status ?? "unknown");
  const planningStatus: PlanningStatus = ["returning", "unsure", "leaving"].includes(rawPlanning) ? rawPlanning as PlanningStatus : "unknown";
  return {
    id: String(row.id), seasonId: String(row.season_id), teamId: String(row.team_id), playerId: String(row.player_id),
    jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number), primaryPosition: String(row.primary_position ?? ""), secondaryPosition: String(row.secondary_position ?? ""), unit,
    rosterStatus, availability, planningStatus, starter: Number(row.starter ?? 0) === 1, captain: Number(row.captain ?? 0) === 1, rookie: Number(row.rookie ?? 0) === 1,
    leadershipRole: String(row.leadership_role ?? ""), joinedAt: row.joined_at ? String(row.joined_at) : null, leftAt: row.left_at ? String(row.left_at) : null,
    createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  };
}

export async function getCurrentSeason() {
  await ensureRosterFoundation();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT * FROM seasons WHERE is_current=1 ORDER BY year DESC LIMIT 1").first<Record<string, unknown>>();
  return row ? mapSeason(row) : null;
}
