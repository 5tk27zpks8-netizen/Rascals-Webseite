import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";

function mapGame(row: Record<string, unknown>) {
  return {
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
  };
}

export async function GET() {
  await ensureFootballSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`
    SELECT * FROM games
    WHERE status <> 'cancelled'
    ORDER BY COALESCE(kickoff,'9999-12-31') ASC, created_at DESC
  `).all();

  return Response.json({
    items: result.results.map((row) => mapGame(row as Record<string, unknown>)),
  }, {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=60" },
  });
}
