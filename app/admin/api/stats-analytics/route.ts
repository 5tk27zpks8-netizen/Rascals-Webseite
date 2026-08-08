import { bindings } from "../../../lib/cms";
import { ensureRosterFoundation } from "../../../lib/roster";
import { addStatTotal, deriveStatMetrics, ensureStatsSchema, mapStatDefinition, type StatCategory } from "../../../lib/stats";
import { requireCmsPermission } from "../../../lib/permissions";

type AggregateRow = Record<string, unknown>;

type PlayerAggregate = {
  playerId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string;
  totals: Record<string, number>;
  derived: ReturnType<typeof deriveStatMetrics>;
};

function buildPlayerAggregates(rows: AggregateRow[]): PlayerAggregate[] {
  const players = new Map<string, Omit<PlayerAggregate, "derived">>();
  for (const row of rows) {
    const playerId = String(row.player_id ?? "");
    if (!playerId) continue;
    let player = players.get(playerId);
    if (!player) {
      player = {
        playerId,
        firstName: String(row.first_name ?? ""),
        lastName: String(row.last_name ?? ""),
        jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
        position: String(row.primary_position ?? row.position ?? ""),
        totals: {},
      };
      players.set(playerId, player);
    }
    addStatTotal(player.totals, String(row.stat_key ?? ""), Number(row.total ?? 0));
  }
  return [...players.values()].map((player) => ({ ...player, derived: deriveStatMetrics(player.totals) }));
}

function buildTeamTotals(rows: AggregateRow[]) {
  const totals: Record<string, number> = {};
  for (const row of rows) addStatTotal(totals, String(row.stat_key ?? ""), Number(row.total ?? 0));
  return { totals, derived: deriveStatMetrics(totals) };
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("stats");
  if (actor instanceof Response) return actor;
  await ensureRosterFoundation();
  await ensureStatsSchema();

  const { DB } = bindings();
  const url = new URL(request.url);
  const categoryRaw = url.searchParams.get("category") || "all";
  const category: "all" | StatCategory = ["offense", "defense", "special-teams"].includes(categoryRaw) ? categoryRaw as StatCategory : "all";

  const seasonsResult = await DB.prepare("SELECT id,year,name,is_current FROM seasons ORDER BY year DESC").all<Record<string, unknown>>();
  const seasons = seasonsResult.results.map((row) => ({
    id: String(row.id), year: Number(row.year), name: String(row.name ?? ""), isCurrent: Number(row.is_current ?? 0) === 1,
  }));
  const requestedSeasonId = url.searchParams.get("seasonId");
  const selectedSeason = seasons.find((item) => item.id === requestedSeasonId) ?? seasons.find((item) => item.isCurrent) ?? seasons[0] ?? null;
  if (!selectedSeason) return Response.json({ error: "Keine Saison vorhanden." }, { status: 404 });

  const definitionResult = await DB.prepare("SELECT * FROM stat_definitions WHERE active=1 ORDER BY category,sort_order,stat_key").all<Record<string, unknown>>();
  const definitions = definitionResult.results.map(mapStatDefinition).filter((definition) => category === "all" || definition.category === category);
  const allowedKeys = new Set(definitions.map((definition) => definition.key));

  const gameColumns = await DB.prepare("PRAGMA table_info(games)").all<Record<string, unknown>>();
  const hasDeletedAt = gameColumns.results.some((row) => String(row.name) === "deleted_at");
  const gamesResult = await DB.prepare(`SELECT id,opponent,opponent_logo,kickoff,status,rascals_score,opponent_score
    FROM games WHERE season_id=? ${hasDeletedAt ? "AND deleted_at IS NULL" : ""}
    ORDER BY COALESCE(kickoff,'9999-12-31') ASC`).bind(selectedSeason.id).all<Record<string, unknown>>();
  const games = gamesResult.results.map((row) => ({
    id: String(row.id), opponent: String(row.opponent ?? ""), opponentLogo: String(row.opponent_logo ?? ""), kickoff: row.kickoff ? String(row.kickoff) : null,
    status: String(row.status ?? "upcoming"), rascalsScore: Number(row.rascals_score ?? 0), opponentScore: Number(row.opponent_score ?? 0),
  }));
  const requestedGameId = url.searchParams.get("gameId") || "";
  const selectedGame = games.find((game) => game.id === requestedGameId) ?? [...games].reverse().find((game) => game.status === "final") ?? games[0] ?? null;

  const playersResult = await DB.prepare(`SELECT rm.player_id AS id,rm.jersey_number,rm.primary_position,p.first_name,p.last_name
    FROM roster_memberships rm JOIN players p ON p.id=rm.player_id
    WHERE rm.season_id=? AND rm.team_id='mens' AND rm.roster_status NOT IN ('left','alumni') AND p.active=1
    ORDER BY rm.primary_position,rm.jersey_number,p.last_name`).bind(selectedSeason.id).all<Record<string, unknown>>();
  const players = playersResult.results.map((row) => ({
    id: String(row.id), jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number), position: String(row.primary_position ?? ""),
    firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""),
  }));
  const requestedPlayerId = url.searchParams.get("playerId") || "";
  const selectedPlayerId = players.some((player) => player.id === requestedPlayerId) ? requestedPlayerId : players[0]?.id ?? "";

  const seasonRowsResult = await DB.prepare(`SELECT pgs.player_id,p.first_name,p.last_name,rm.jersey_number,rm.primary_position,pgs.stat_key,SUM(pgs.stat_value) AS total
    FROM player_game_stats pgs
    JOIN players p ON p.id=pgs.player_id
    LEFT JOIN roster_memberships rm ON rm.player_id=pgs.player_id AND rm.season_id=? AND rm.team_id='mens'
    WHERE pgs.season_id=? AND pgs.status='official'
    GROUP BY pgs.player_id,p.first_name,p.last_name,rm.jersey_number,rm.primary_position,pgs.stat_key
    ORDER BY p.last_name,p.first_name,pgs.stat_key`).bind(selectedSeason.id, selectedSeason.id).all<AggregateRow>();
  const seasonRows = seasonRowsResult.results.filter((row) => allowedKeys.has(String(row.stat_key)));
  const seasonPlayers = buildPlayerAggregates(seasonRows);
  const seasonTeam = buildTeamTotals(seasonRows);

  let boxScore = null as null | {
    game: NonNullable<typeof selectedGame>;
    statusCounts: { provisional: number; reviewed: number; official: number };
    players: PlayerAggregate[];
    team: ReturnType<typeof buildTeamTotals>;
  };
  if (selectedGame) {
    const gameRowsResult = await DB.prepare(`SELECT pgs.player_id,p.first_name,p.last_name,rm.jersey_number,rm.primary_position,pgs.stat_key,SUM(pgs.stat_value) AS total
      FROM player_game_stats pgs
      JOIN players p ON p.id=pgs.player_id
      LEFT JOIN roster_memberships rm ON rm.player_id=pgs.player_id AND rm.season_id=? AND rm.team_id='mens'
      WHERE pgs.game_id=? AND pgs.status='official'
      GROUP BY pgs.player_id,p.first_name,p.last_name,rm.jersey_number,rm.primary_position,pgs.stat_key
      ORDER BY p.last_name,p.first_name,pgs.stat_key`).bind(selectedSeason.id, selectedGame.id).all<AggregateRow>();
    const gameRows = gameRowsResult.results.filter((row) => allowedKeys.has(String(row.stat_key)));
    const counts = await DB.prepare(`SELECT
      SUM(CASE WHEN status='provisional' THEN 1 ELSE 0 END) AS provisional,
      SUM(CASE WHEN status='reviewed' THEN 1 ELSE 0 END) AS reviewed,
      SUM(CASE WHEN status='official' THEN 1 ELSE 0 END) AS official
      FROM player_game_stats WHERE game_id=?`).bind(selectedGame.id).first<Record<string, unknown>>();
    boxScore = {
      game: selectedGame,
      statusCounts: { provisional: Number(counts?.provisional ?? 0), reviewed: Number(counts?.reviewed ?? 0), official: Number(counts?.official ?? 0) },
      players: buildPlayerAggregates(gameRows),
      team: buildTeamTotals(gameRows),
    };
  }

  let playerAnalytics = null as null | {
    player: { id: string; firstName: string; lastName: string; jerseyNumber: number | null; position: string };
    season: { totals: Record<string, number>; derived: ReturnType<typeof deriveStatMetrics> };
    career: { totals: Record<string, number>; derived: ReturnType<typeof deriveStatMetrics>; bySeason: Array<{ seasonId: string | null; season: number; totals: Record<string, number>; derived: ReturnType<typeof deriveStatMetrics> }> };
  };
  if (selectedPlayerId) {
    const player = players.find((item) => item.id === selectedPlayerId)!;
    const seasonAggregate = seasonPlayers.find((item) => item.playerId === selectedPlayerId);
    const careerResult = await DB.prepare(`SELECT season_id,season,stat_key,SUM(stat_value) AS total
      FROM player_game_stats WHERE player_id=? AND status='official'
      GROUP BY season_id,season,stat_key ORDER BY season ASC,stat_key`).bind(selectedPlayerId).all<AggregateRow>();
    const filteredCareerRows = careerResult.results.filter((row) => allowedKeys.has(String(row.stat_key)));
    const careerTotals: Record<string, number> = {};
    const seasonMaps = new Map<string, { seasonId: string | null; season: number; totals: Record<string, number> }>();
    for (const row of filteredCareerRows) {
      const key = `${String(row.season_id ?? "")}|${Number(row.season ?? 0)}`;
      if (!seasonMaps.has(key)) seasonMaps.set(key, { seasonId: row.season_id ? String(row.season_id) : null, season: Number(row.season ?? 0), totals: {} });
      addStatTotal(seasonMaps.get(key)!.totals, String(row.stat_key), Number(row.total ?? 0));
      addStatTotal(careerTotals, String(row.stat_key), Number(row.total ?? 0));
    }
    playerAnalytics = {
      player,
      season: { totals: seasonAggregate?.totals ?? {}, derived: seasonAggregate?.derived ?? [] },
      career: {
        totals: careerTotals,
        derived: deriveStatMetrics(careerTotals),
        bySeason: [...seasonMaps.values()].map((item) => ({ ...item, derived: deriveStatMetrics(item.totals) })),
      },
    };
  }

  return Response.json({
    officialOnly: true,
    selectedSeason,
    seasons,
    games,
    selectedGameId: selectedGame?.id ?? "",
    players,
    selectedPlayerId,
    definitions,
    boxScore,
    seasonAggregate: { players: seasonPlayers, team: seasonTeam },
    playerAnalytics,
  });
}
