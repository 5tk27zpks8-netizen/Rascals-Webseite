import { bindings } from "../../../lib/cms";
import { ensureGamedayRosterSchema } from "../../../lib/gameday-roster";
import { ensureStatsSchema } from "../../../lib/stats";
import { requireCmsPermission } from "../../../lib/permissions";

type Row = Record<string, unknown>;

export async function GET(request: Request) {
  const actor = await requireCmsPermission("games");
  if (actor instanceof Response) return actor;
  await ensureGamedayRosterSchema();
  await ensureStatsSchema();
  const { DB } = bindings();
  const url = new URL(request.url);

  const gameInfo = await DB.prepare("PRAGMA table_info(games)").all<Row>();
  const hasDeletedAt = gameInfo.results.some((row) => String(row.name) === "deleted_at");
  const whereDeleted = hasDeletedAt ? "WHERE g.deleted_at IS NULL" : "";

  const gamesResult = await DB.prepare(`SELECT g.id,g.slug,g.opponent,g.opponent_logo,g.venue,g.home_away,g.kickoff,g.status,g.rascals_score,g.opponent_score,g.quarter,g.game_clock,g.season_id,
      s.year AS season_year,s.name AS season_name,COALESCE(gc.status,'not-started') AS roster_status,gc.locked_at,gc.locked_by,
      COALESCE((SELECT COUNT(*) FROM gameday_roster_entries ge WHERE ge.game_id=g.id AND ge.status='active'),0) AS active_roster,
      COALESCE((SELECT COUNT(*) FROM gameday_roster_entries ge WHERE ge.game_id=g.id AND ge.status='inactive'),0) AS inactive_roster,
      COALESCE((SELECT COUNT(*) FROM game_events ev WHERE ev.game_id=g.id),0) AS event_count,
      COALESCE((SELECT COUNT(*) FROM player_game_stats st WHERE st.game_id=g.id AND st.status='provisional'),0) AS provisional_stats,
      COALESCE((SELECT COUNT(*) FROM player_game_stats st WHERE st.game_id=g.id AND st.status='reviewed'),0) AS reviewed_stats,
      COALESCE((SELECT COUNT(*) FROM player_game_stats st WHERE st.game_id=g.id AND st.status='official'),0) AS official_stats
    FROM games g
    LEFT JOIN seasons s ON s.id=g.season_id
    LEFT JOIN gameday_roster_control gc ON gc.game_id=g.id
    ${whereDeleted}
    ORDER BY CASE g.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 WHEN 'final' THEN 2 ELSE 3 END, COALESCE(g.kickoff,'9999-12-31') ASC`).all<Row>();

  const games = gamesResult.results.map((row) => ({
    id: String(row.id), slug: String(row.slug ?? ""), opponent: String(row.opponent ?? ""), opponentLogo: String(row.opponent_logo ?? ""),
    venue: String(row.venue ?? ""), homeAway: String(row.home_away ?? "home"), kickoff: row.kickoff ? String(row.kickoff) : null,
    status: String(row.status ?? "upcoming"), rascalsScore: Number(row.rascals_score ?? 0), opponentScore: Number(row.opponent_score ?? 0),
    quarter: String(row.quarter ?? ""), gameClock: String(row.game_clock ?? ""), seasonId: String(row.season_id ?? ""),
    seasonYear: row.season_year == null ? null : Number(row.season_year), seasonName: String(row.season_name ?? ""),
    rosterStatus: String(row.roster_status ?? "not-started"), lockedAt: row.locked_at ? String(row.locked_at) : null, lockedBy: String(row.locked_by ?? ""),
    activeRoster: Number(row.active_roster ?? 0), inactiveRoster: Number(row.inactive_roster ?? 0), eventCount: Number(row.event_count ?? 0),
    provisionalStats: Number(row.provisional_stats ?? 0), reviewedStats: Number(row.reviewed_stats ?? 0), officialStats: Number(row.official_stats ?? 0),
  }));

  const requested = url.searchParams.get("gameId");
  const game = games.find((item) => item.id === requested) ?? games.find((item) => item.status === "live") ?? games.find((item) => item.status === "upcoming") ?? games[0] ?? null;
  if (!game) return Response.json({ current: actor, games, game: null });

  const rosterEntries = await DB.prepare(`SELECT ge.status,ge.starter,ge.captain,ge.emergency,ge.special_teams_role,rm.availability,rm.primary_position,p.first_name,p.last_name,rm.jersey_number
    FROM gameday_roster_entries ge JOIN roster_memberships rm ON rm.id=ge.roster_membership_id JOIN players p ON p.id=ge.player_id
    WHERE ge.game_id=? ORDER BY ge.status DESC,rm.unit,rm.primary_position,rm.jersey_number,p.last_name`).bind(game.id).all<Row>();
  const roster = rosterEntries.results.map((row) => ({
    status: String(row.status ?? "active"), starter: Number(row.starter ?? 0) === 1, captain: Number(row.captain ?? 0) === 1, emergency: Number(row.emergency ?? 0) === 1,
    specialTeamsRole: String(row.special_teams_role ?? ""), availability: String(row.availability ?? "full"), position: String(row.primary_position ?? ""),
    firstName: String(row.first_name ?? ""), lastName: String(row.last_name ?? ""), jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
  }));

  const recentEvents = await DB.prepare(`SELECT id,event_type,points,quarter,game_clock,text,created_at FROM game_events WHERE game_id=? ORDER BY created_at DESC LIMIT 12`).bind(game.id).all<Row>();
  const readiness = {
    scheduleComplete: Boolean(game.opponent && game.kickoff && game.venue),
    opponentLogo: Boolean(game.opponentLogo),
    rosterInitialized: game.rosterStatus !== "not-started",
    rosterLocked: game.rosterStatus === "locked",
    availabilityClear: !roster.some((entry) => entry.status === "active" && ["out"].includes(entry.availability)),
    postgameReviewed: game.provisionalStats === 0 && game.reviewedStats === 0 && game.officialStats > 0,
  };

  const now = Date.now();
  const upcoming = games.filter((item) => item.status === "upcoming" && item.kickoff && new Date(item.kickoff).getTime() >= now).sort((a,b)=>new Date(a.kickoff!).getTime()-new Date(b.kickoff!).getTime())[0] ?? null;

  return Response.json({
    current: actor, games, game, roster,
    recentEvents: recentEvents.results.map((row) => ({ id: String(row.id), eventType: String(row.event_type ?? ""), points: Number(row.points ?? 0), quarter: String(row.quarter ?? ""), gameClock: String(row.game_clock ?? ""), text: String(row.text ?? ""), createdAt: String(row.created_at ?? "") })),
    readiness,
    summary: {
      totalGames: games.length,
      upcomingGames: games.filter((item) => item.status === "upcoming").length,
      finalGames: games.filter((item) => item.status === "final").length,
      liveGames: games.filter((item) => item.status === "live").length,
      nextGameId: upcoming?.id ?? null,
      activeRoster: game.activeRoster,
      inactiveRoster: game.inactiveRoster,
      eventCount: game.eventCount,
      provisionalStats: game.provisionalStats,
      reviewedStats: game.reviewedStats,
      officialStats: game.officialStats,
    },
  });
}
