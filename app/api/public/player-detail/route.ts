import { listPlayerAchievements, listPlayerStats } from "../../../lib/football";

/**
 * The numbers behind one player, fetched when his card is opened.
 *
 * Deliberately not part of the roster payload. The showcase carries seventy-odd
 * players and every one of them would need two more queries and a few hundred
 * bytes on a page nobody has clicked anything on yet — for data that is only
 * ever read one player at a time. Loading it on the open costs one request at
 * the moment it is wanted and nothing at all before that.
 *
 * Everything here is already public on the team pages; this is a read-only view
 * over the same rows.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "missing id" }, { status: 400 });
  }

  try {
    const [stats, achievements] = await Promise.all([
      listPlayerStats(id).catch(() => []),
      listPlayerAchievements(id).catch(() => []),
    ]);
    return Response.json(
      { stats, achievements },
      {
        /* Briefly cacheable: a season total does not change between two clicks,
           and the panel is opened and reopened as people browse the squad. */
        headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
      },
    );
  } catch {
    /* A player with no recorded stats is the normal case for most of a club
       squad, not an error worth showing anybody. The panel renders its own
       "no numbers yet" state from an empty list. */
    return Response.json({ stats: [], achievements: [] });
  }
}
