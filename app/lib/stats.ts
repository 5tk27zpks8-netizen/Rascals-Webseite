import { bindings } from "./cms";
import { ensureFootballSchema } from "./football";

export type StatStatus = "provisional" | "reviewed" | "official";
export type StatCategory = "offense" | "defense" | "special-teams";

export type StatDefinition = {
  key: string;
  label: string;
  shortLabel: string;
  category: StatCategory;
  valueType: "count" | "yards" | "attempts" | "percentage";
  aggregation: "sum" | "average" | "derived";
  positions: string[];
  active: boolean;
  sortOrder: number;
};

export type DerivedStatMetric = {
  key: string;
  label: string;
  shortLabel: string;
  category: StatCategory;
  value: number;
  valueType: "percentage" | "average";
};

const DEFINITIONS: Array<Omit<StatDefinition, "positions"> & { positions: string }> = [
  { key: "pass_attempts", label: "Pass Attempts", shortLabel: "ATT", category: "offense", valueType: "attempts", aggregation: "sum", positions: "QB", active: true, sortOrder: 10 },
  { key: "pass_completions", label: "Pass Completions", shortLabel: "CMP", category: "offense", valueType: "count", aggregation: "sum", positions: "QB", active: true, sortOrder: 20 },
  { key: "passing_yards", label: "Passing Yards", shortLabel: "PASS YDS", category: "offense", valueType: "yards", aggregation: "sum", positions: "QB", active: true, sortOrder: 30 },
  { key: "passing_td", label: "Passing Touchdowns", shortLabel: "PASS TD", category: "offense", valueType: "count", aggregation: "sum", positions: "QB", active: true, sortOrder: 40 },
  { key: "interceptions_thrown", label: "Interceptions Thrown", shortLabel: "INT", category: "offense", valueType: "count", aggregation: "sum", positions: "QB", active: true, sortOrder: 50 },
  { key: "carries", label: "Carries", shortLabel: "CAR", category: "offense", valueType: "attempts", aggregation: "sum", positions: "RB,FB,QB,WR", active: true, sortOrder: 60 },
  { key: "rushing_yards", label: "Rushing Yards", shortLabel: "RUSH YDS", category: "offense", valueType: "yards", aggregation: "sum", positions: "RB,FB,QB,WR", active: true, sortOrder: 70 },
  { key: "rushing_td", label: "Rushing Touchdowns", shortLabel: "RUSH TD", category: "offense", valueType: "count", aggregation: "sum", positions: "RB,FB,QB,WR", active: true, sortOrder: 80 },
  { key: "targets", label: "Targets", shortLabel: "TGT", category: "offense", valueType: "attempts", aggregation: "sum", positions: "WR,TE,RB,FB", active: true, sortOrder: 90 },
  { key: "receptions", label: "Receptions", shortLabel: "REC", category: "offense", valueType: "count", aggregation: "sum", positions: "WR,TE,RB,FB", active: true, sortOrder: 100 },
  { key: "receiving_yards", label: "Receiving Yards", shortLabel: "REC YDS", category: "offense", valueType: "yards", aggregation: "sum", positions: "WR,TE,RB,FB", active: true, sortOrder: 110 },
  { key: "receiving_td", label: "Receiving Touchdowns", shortLabel: "REC TD", category: "offense", valueType: "count", aggregation: "sum", positions: "WR,TE,RB,FB", active: true, sortOrder: 120 },
  { key: "drops", label: "Drops", shortLabel: "DROP", category: "offense", valueType: "count", aggregation: "sum", positions: "WR,TE,RB,FB", active: true, sortOrder: 130 },
  { key: "yac", label: "Yards After Catch", shortLabel: "YAC", category: "offense", valueType: "yards", aggregation: "sum", positions: "WR,TE,RB,FB", active: true, sortOrder: 140 },
  { key: "touchdowns", label: "Touchdowns", shortLabel: "TD", category: "offense", valueType: "count", aggregation: "sum", positions: "QB,RB,FB,WR,TE", active: true, sortOrder: 150 },

  { key: "tackles_solo", label: "Solo Tackles", shortLabel: "SOLO", category: "defense", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 210 },
  { key: "tackles_assisted", label: "Assisted Tackles", shortLabel: "AST", category: "defense", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 220 },
  { key: "tackles", label: "Total Tackles", shortLabel: "TACK", category: "defense", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 230 },
  { key: "tfl", label: "Tackles for Loss", shortLabel: "TFL", category: "defense", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 240 },
  { key: "sacks", label: "Sacks", shortLabel: "SACK", category: "defense", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 250 },
  { key: "qb_hits", label: "QB Hits", shortLabel: "QBH", category: "defense", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,MLB,ILB,OLB,DB", active: true, sortOrder: 260 },
  { key: "interceptions", label: "Interceptions", shortLabel: "INT", category: "defense", valueType: "count", aggregation: "sum", positions: "LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 270 },
  { key: "pass_breakups", label: "Pass Breakups", shortLabel: "PBU", category: "defense", valueType: "count", aggregation: "sum", positions: "LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 280 },
  { key: "forced_fumbles", label: "Forced Fumbles", shortLabel: "FF", category: "defense", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 290 },
  { key: "fumble_recoveries", label: "Fumble Recoveries", shortLabel: "FR", category: "defense", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,MLB,ILB,OLB,DB,CB,FS,SS", active: true, sortOrder: 300 },

  { key: "field_goals_made", label: "Field Goals Made", shortLabel: "FGM", category: "special-teams", valueType: "count", aggregation: "sum", positions: "K", active: true, sortOrder: 410 },
  { key: "field_goals_attempted", label: "Field Goals Attempted", shortLabel: "FGA", category: "special-teams", valueType: "attempts", aggregation: "sum", positions: "K", active: true, sortOrder: 420 },
  { key: "pat_made", label: "PAT Made", shortLabel: "PAT", category: "special-teams", valueType: "count", aggregation: "sum", positions: "K", active: true, sortOrder: 430 },
  { key: "punts", label: "Punts", shortLabel: "PUNT", category: "special-teams", valueType: "attempts", aggregation: "sum", positions: "P", active: true, sortOrder: 440 },
  { key: "punt_yards", label: "Punt Yards", shortLabel: "PUNT YDS", category: "special-teams", valueType: "yards", aggregation: "sum", positions: "P", active: true, sortOrder: 450 },
  { key: "kick_return_yards", label: "Kick Return Yards", shortLabel: "KR YDS", category: "special-teams", valueType: "yards", aggregation: "sum", positions: "KR,WR,RB,DB", active: true, sortOrder: 460 },
  { key: "punt_return_yards", label: "Punt Return Yards", shortLabel: "PR YDS", category: "special-teams", valueType: "yards", aggregation: "sum", positions: "PR,WR,RB,DB", active: true, sortOrder: 470 },
  { key: "coverage_tackles", label: "Coverage Tackles", shortLabel: "ST TACK", category: "special-teams", valueType: "count", aggregation: "sum", positions: "LB,DB,CB,WR,RB,TE", active: true, sortOrder: 480 },
  { key: "blocked_kicks", label: "Blocked Kicks", shortLabel: "BLK", category: "special-teams", valueType: "count", aggregation: "sum", positions: "DL,DE,DT,NT,LB,DB", active: true, sortOrder: 490 },
];

async function tableColumns(table: string) {
  const { DB } = bindings();
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all<Record<string, unknown>>();
  return new Set(info.results.map((row) => String(row.name)));
}

export async function ensureStatsSchema() {
  await ensureFootballSchema();
  const { DB } = bindings();

  const gameColumns = await tableColumns("games");
  if (!gameColumns.has("season_id")) await DB.prepare("ALTER TABLE games ADD COLUMN season_id TEXT").run();

  const statColumns = await tableColumns("player_game_stats");
  if (!statColumns.has("season_id")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN season_id TEXT").run();
  if (!statColumns.has("status")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN status TEXT NOT NULL DEFAULT 'official'").run();
  if (!statColumns.has("source")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN source TEXT NOT NULL DEFAULT 'legacy'").run();
  if (!statColumns.has("source_event_id")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN source_event_id TEXT").run();
  if (!statColumns.has("note")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN note TEXT NOT NULL DEFAULT ''").run();
  if (!statColumns.has("created_by")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN created_by TEXT NOT NULL DEFAULT ''").run();
  if (!statColumns.has("reviewed_by")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN reviewed_by TEXT NOT NULL DEFAULT ''").run();
  if (!statColumns.has("reviewed_at")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN reviewed_at TEXT").run();
  if (!statColumns.has("official_by")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN official_by TEXT NOT NULL DEFAULT ''").run();
  if (!statColumns.has("official_at")) await DB.prepare("ALTER TABLE player_game_stats ADD COLUMN official_at TEXT").run();

  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS stat_definitions (
      stat_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      short_label TEXT NOT NULL,
      category TEXT NOT NULL,
      value_type TEXT NOT NULL DEFAULT 'count',
      aggregation TEXT NOT NULL DEFAULT 'sum',
      positions TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare(`CREATE TABLE IF NOT EXISTS stat_status_history (
      id TEXT PRIMARY KEY,
      stat_id TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      changed_by TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_stats_game_status ON player_game_stats(game_id,status)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_stats_season_status ON player_game_stats(season_id,status,stat_key)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_stats_source_event ON player_game_stats(source_event_id)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_stat_history_stat ON stat_status_history(stat_id,changed_at)"),
  ]);

  await DB.batch(DEFINITIONS.map((definition) => DB.prepare(`INSERT INTO stat_definitions
    (stat_key,label,short_label,category,value_type,aggregation,positions,active,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(stat_key) DO UPDATE SET label=excluded.label,short_label=excluded.short_label,category=excluded.category,value_type=excluded.value_type,
      aggregation=excluded.aggregation,positions=excluded.positions,active=excluded.active,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP`)
    .bind(definition.key, definition.label, definition.shortLabel, definition.category, definition.valueType, definition.aggregation, definition.positions, definition.active ? 1 : 0, definition.sortOrder)));

  await DB.prepare(`UPDATE player_game_stats SET season_id=(SELECT s.id FROM seasons s WHERE s.year=player_game_stats.season LIMIT 1)
    WHERE (season_id IS NULL OR season_id='') AND EXISTS (SELECT 1 FROM seasons s WHERE s.year=player_game_stats.season)`).run().catch(() => undefined);
  await DB.prepare(`UPDATE games SET season_id=(SELECT s.id FROM seasons s WHERE s.year=CAST(substr(games.kickoff,1,4) AS INTEGER) LIMIT 1)
    WHERE (season_id IS NULL OR season_id='') AND kickoff IS NOT NULL AND length(kickoff)>=4`).run().catch(() => undefined);
}

export function mapStatDefinition(row: Record<string, unknown>): StatDefinition {
  const categoryRaw = String(row.category ?? "offense");
  const category: StatCategory = categoryRaw === "defense" || categoryRaw === "special-teams" ? categoryRaw : "offense";
  const valueTypeRaw = String(row.value_type ?? "count");
  const valueType: StatDefinition["valueType"] = ["yards", "attempts", "percentage"].includes(valueTypeRaw) ? valueTypeRaw as StatDefinition["valueType"] : "count";
  const aggregationRaw = String(row.aggregation ?? "sum");
  const aggregation: StatDefinition["aggregation"] = ["average", "derived"].includes(aggregationRaw) ? aggregationRaw as StatDefinition["aggregation"] : "sum";
  return {
    key: String(row.stat_key), label: String(row.label ?? row.stat_key ?? "Stat"), shortLabel: String(row.short_label ?? row.stat_key ?? "STAT"), category,
    valueType, aggregation, positions: String(row.positions ?? "").split(",").map((item) => item.trim()).filter(Boolean), active: Number(row.active ?? 1) === 1, sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function getStatDefinitions() {
  await ensureStatsSchema();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM stat_definitions WHERE active=1 ORDER BY category,sort_order,stat_key").all<Record<string, unknown>>();
  return result.results.map(mapStatDefinition);
}

export function addStatTotal(totals: Record<string, number>, key: string, value: number) {
  if (!key || !Number.isFinite(value)) return totals;
  totals[key] = (totals[key] ?? 0) + value;
  return totals;
}

export function deriveStatMetrics(totals: Record<string, number>): DerivedStatMetric[] {
  const metrics: DerivedStatMetric[] = [];
  const ratio = (key: string, label: string, shortLabel: string, category: StatCategory, numeratorKey: string, denominatorKey: string, multiplier = 1, valueType: "percentage" | "average" = "average") => {
    const denominator = totals[denominatorKey] ?? 0;
    if (denominator <= 0) return;
    const numerator = totals[numeratorKey] ?? 0;
    const raw = (numerator / denominator) * multiplier;
    metrics.push({ key, label, shortLabel, category, value: Math.round(raw * 10) / 10, valueType });
  };

  ratio("completion_pct", "Completion Percentage", "CMP%", "offense", "pass_completions", "pass_attempts", 100, "percentage");
  ratio("yards_per_carry", "Yards per Carry", "YPC", "offense", "rushing_yards", "carries");
  ratio("yards_per_reception", "Yards per Reception", "YPR", "offense", "receiving_yards", "receptions");
  ratio("catch_pct", "Catch Percentage", "CATCH%", "offense", "receptions", "targets", 100, "percentage");
  ratio("field_goal_pct", "Field Goal Percentage", "FG%", "special-teams", "field_goals_made", "field_goals_attempted", 100, "percentage");
  ratio("punt_average", "Punt Average", "PUNT AVG", "special-teams", "punt_yards", "punts");

  return metrics;
}
