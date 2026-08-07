import { bindings } from "./cms";

export type PlayerUnit = "offense" | "defense" | "special-teams";
export type PlayerStatus = "active" | "questionable" | "out" | "ir";

export type Player = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  nickname: string;
  jerseyNumber: number | null;
  position: string;
  secondaryPosition: string;
  unit: PlayerUnit;
  teamId: string;
  heightCm: number | null;
  weightKg: number | null;
  birthDate: string | null;
  joinedYear: number | null;
  portrait: string;
  bio: string;
  instagram: string;
  captain: boolean;
  starter: boolean;
  rookie: boolean;
  status: PlayerStatus;
  returnDate: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlayerAchievement = {
  id: string;
  playerId: string;
  gameId: string | null;
  type: string;
  label: string;
  quantity: number;
  note: string;
  awardedBy: string;
  awardedAt: string;
};

export type PlayerStat = { key: string; value: number };

export type Game = {
  id: string;
  slug: string;
  opponent: string;
  opponentLogo: string;
  venue: string;
  homeAway: "home" | "away";
  kickoff: string | null;
  status: "upcoming" | "live" | "final" | "postponed" | "cancelled";
  rascalsScore: number;
  opponentScore: number;
  quarter: string;
  gameClock: string;
  createdAt: string;
  updatedAt: string;
};

export type GameEvent = {
  id: string;
  gameId: string;
  playerId: string | null;
  playerName: string;
  playerNumber: number | null;
  team: string;
  eventType: string;
  points: number;
  quarter: string;
  gameClock: string;
  text: string;
  createdAt: string;
};

export async function ensureFootballSchema() {
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      league TEXT NOT NULL DEFAULT '',
      season INTEGER,
      description TEXT NOT NULL DEFAULT '',
      logo TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      jersey_number INTEGER,
      position TEXT NOT NULL DEFAULT '',
      secondary_position TEXT NOT NULL DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'defense',
      team_id TEXT NOT NULL DEFAULT 'mens',
      height_cm INTEGER,
      weight_kg INTEGER,
      birth_date TEXT,
      joined_year INTEGER,
      portrait TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      instagram TEXT NOT NULL DEFAULT '',
      captain INTEGER NOT NULL DEFAULT 0,
      starter INTEGER NOT NULL DEFAULT 0,
      rookie INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      return_date TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS player_achievements (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      game_id TEXT,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      note TEXT NOT NULL DEFAULT '',
      awarded_by TEXT NOT NULL DEFAULT '',
      awarded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS player_game_stats (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      game_id TEXT,
      season INTEGER NOT NULL DEFAULT 2026,
      stat_key TEXT NOT NULL,
      stat_value REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_game_stats(player_id)`),
    DB.prepare(`CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_id)`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      opponent TEXT NOT NULL,
      opponent_logo TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      home_away TEXT NOT NULL DEFAULT 'home',
      kickoff TEXT,
      status TEXT NOT NULL DEFAULT 'upcoming',
      rascals_score INTEGER NOT NULL DEFAULT 0,
      opponent_score INTEGER NOT NULL DEFAULT 0,
      quarter TEXT NOT NULL DEFAULT '',
      game_clock TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS game_events (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      player_id TEXT,
      team TEXT NOT NULL DEFAULT 'rascals',
      event_type TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      quarter TEXT NOT NULL DEFAULT '',
      game_clock TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
  ]);

  await DB.prepare(`INSERT OR IGNORE INTO teams (id,name,slug,league,season,description)
    VALUES ('mens','Herren','herren','Kreisoberliga',2026,'Hellenstein Rascals Herrenmannschaft')`).run();
}

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

export function mapPlayer(row: Record<string, unknown>): Player {
  const unit = ["offense", "defense", "special-teams"].includes(String(row.unit)) ? String(row.unit) as PlayerUnit : "defense";
  const status = ["active", "questionable", "out", "ir"].includes(String(row.status)) ? String(row.status) as PlayerStatus : "active";
  return {
    id: String(row.id), slug: String(row.slug), firstName: String(row.first_name), lastName: String(row.last_name), nickname: String(row.nickname ?? ""),
    jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number), position: String(row.position ?? ""), secondaryPosition: String(row.secondary_position ?? ""), unit,
    teamId: String(row.team_id ?? "mens"), heightCm: row.height_cm == null ? null : Number(row.height_cm), weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    birthDate: row.birth_date ? String(row.birth_date) : null, joinedYear: row.joined_year == null ? null : Number(row.joined_year), portrait: String(row.portrait ?? ""), bio: String(row.bio ?? ""),
    instagram: String(row.instagram ?? ""), captain: Number(row.captain ?? 0) === 1, starter: Number(row.starter ?? 0) === 1, rookie: Number(row.rookie ?? 0) === 1,
    status, returnDate: row.return_date ? String(row.return_date) : null, active: Number(row.active ?? 1) === 1, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export function mapGame(row: Record<string, unknown>): Game {
  const rawStatus = String(row.status ?? "upcoming");
  const status = ["upcoming", "live", "final", "postponed", "cancelled"].includes(rawStatus) ? rawStatus as Game["status"] : "upcoming";
  return {
    id: String(row.id), slug: String(row.slug), opponent: String(row.opponent ?? ""), opponentLogo: String(row.opponent_logo ?? ""), venue: String(row.venue ?? ""),
    homeAway: String(row.home_away) === "away" ? "away" : "home", kickoff: row.kickoff ? String(row.kickoff) : null, status,
    rascalsScore: Number(row.rascals_score ?? 0), opponentScore: Number(row.opponent_score ?? 0), quarter: String(row.quarter ?? ""), gameClock: String(row.game_clock ?? ""),
    createdAt: String(row.created_at ?? ""), updatedAt: String(row.updated_at ?? ""),
  };
}

export async function listActivePlayers() {
  await ensureFootballSchema();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM players WHERE active=1 ORDER BY unit, position, jersey_number, last_name").all();
  return result.results.map((row) => mapPlayer(row as Record<string, unknown>));
}

export async function getPlayerBySlug(slug: string) {
  await ensureFootballSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT * FROM players WHERE slug=? AND active=1 LIMIT 1").bind(slug).first<Record<string, unknown>>();
  return row ? mapPlayer(row) : null;
}

export async function listPlayerAchievements(playerId: string) {
  await ensureFootballSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT * FROM player_achievements WHERE player_id=? ORDER BY awarded_at DESC`).bind(playerId).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: String(row.id), playerId: String(row.player_id), gameId: row.game_id ? String(row.game_id) : null, type: String(row.type ?? "achievement"),
    label: String(row.label ?? "Achievement"), quantity: Number(row.quantity ?? 1), note: String(row.note ?? ""), awardedBy: String(row.awarded_by ?? ""), awardedAt: String(row.awarded_at),
  } satisfies PlayerAchievement));
}

export async function listPlayerStats(playerId: string, season = 2026) {
  await ensureFootballSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT stat_key, SUM(stat_value) AS total FROM player_game_stats WHERE player_id=? AND season=? GROUP BY stat_key ORDER BY stat_key`).bind(playerId, season).all<Record<string, unknown>>();
  return result.results.map((row) => ({ key: String(row.stat_key), value: Number(row.total ?? 0) } satisfies PlayerStat));
}

export async function listGames() {
  await ensureFootballSchema();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM games ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, COALESCE(kickoff,'9999-12-31') ASC").all<Record<string, unknown>>();
  return result.results.map(mapGame);
}

export async function getGameBySlug(slug: string) {
  await ensureFootballSchema();
  const { DB } = bindings();
  const row = await DB.prepare("SELECT * FROM games WHERE slug=? LIMIT 1").bind(slug).first<Record<string, unknown>>();
  return row ? mapGame(row) : null;
}

export async function listGameEvents(gameId: string, limit = 30) {
  await ensureFootballSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT e.*, p.first_name, p.last_name, p.jersey_number
    FROM game_events e LEFT JOIN players p ON p.id=e.player_id
    WHERE e.game_id=? ORDER BY e.created_at DESC LIMIT ?`).bind(gameId, limit).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: String(row.id), gameId: String(row.game_id), playerId: row.player_id ? String(row.player_id) : null,
    playerName: [String(row.first_name ?? ""), String(row.last_name ?? "")].join(" ").trim(), playerNumber: row.jersey_number == null ? null : Number(row.jersey_number),
    team: String(row.team ?? "rascals"), eventType: String(row.event_type ?? "update"), points: Number(row.points ?? 0), quarter: String(row.quarter ?? ""),
    gameClock: String(row.game_clock ?? ""), text: String(row.text ?? ""), createdAt: String(row.created_at ?? ""),
  } satisfies GameEvent));
}
