import { bindings } from "../../../lib/cms";
import { ensureCoachesSchema } from "../../../lib/coaches";
import { ensureFootballSchema } from "../../../lib/football";
import { getCmsActor } from "../../../lib/permissions";
import { ensureNewsSchema } from "../../../api/news/route";

async function ensureSponsorsSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS sponsors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    tier TEXT NOT NULL DEFAULT 'partner',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

export async function GET() {
  const actor = await getCmsActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await Promise.all([ensureFootballSchema(), ensureCoachesSchema(), ensureNewsSchema(), ensureSponsorsSchema()]);
  const { DB } = bindings();

  const [players, coaches, sponsors, news, games, latestNews] = await Promise.all([
    DB.prepare("SELECT COUNT(*) AS total FROM players WHERE active=1").first<{ total: number }>(),
    DB.prepare("SELECT COUNT(*) AS total FROM coaches WHERE active=1").first<{ total: number }>(),
    DB.prepare("SELECT COUNT(*) AS total FROM sponsors WHERE active=1").first<{ total: number }>(),
    DB.prepare("SELECT COUNT(*) AS total FROM news_posts WHERE status='published'").first<{ total: number }>(),
    DB.prepare(`SELECT * FROM games WHERE status <> 'cancelled' ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, COALESCE(kickoff,'9999-12-31') ASC`).all<Record<string, unknown>>(),
    DB.prepare(`SELECT id,slug,title,status,published_at,updated_at FROM news_posts ORDER BY COALESCE(published_at,updated_at) DESC LIMIT 3`).all<Record<string, unknown>>(),
  ]);

  const mappedGames = games.results.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    opponent: String(row.opponent ?? ""),
    opponentLogo: String(row.opponent_logo ?? ""),
    venue: String(row.venue ?? ""),
    homeAway: String(row.home_away ?? "home"),
    kickoff: row.kickoff ? String(row.kickoff) : null,
    status: String(row.status ?? "upcoming"),
    rascalsScore: Number(row.rascals_score ?? 0),
    opponentScore: Number(row.opponent_score ?? 0),
    quarter: String(row.quarter ?? ""),
    gameClock: String(row.game_clock ?? ""),
  }));

  const liveGame = mappedGames.find((game) => game.status === "live") ?? null;
  const nextGame = mappedGames.find((game) => game.status === "upcoming") ?? null;
  const completed = mappedGames.filter((game) => game.status === "final");
  const wins = completed.filter((game) => game.rascalsScore > game.opponentScore).length;
  const losses = completed.filter((game) => game.rascalsScore < game.opponentScore).length;

  return Response.json({
    current: actor,
    metrics: {
      players: Number(players?.total ?? 0),
      coaches: Number(coaches?.total ?? 0),
      sponsors: Number(sponsors?.total ?? 0),
      publishedNews: Number(news?.total ?? 0),
      games: mappedGames.length,
      wins,
      losses,
    },
    liveGame,
    nextGame,
    recentNews: latestNews.results.map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title ?? ""),
      status: String(row.status ?? "draft"),
      date: String(row.published_at ?? row.updated_at ?? ""),
    })),
  });
}
