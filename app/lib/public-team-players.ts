import { bindings } from "./cms";
import { ensureFootballSchema, mapPlayer } from "./football";

export async function listPublicTeamPlayers() {
  await ensureFootballSchema();
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(players)").all<Record<string, unknown>>();
  const hasDeletedAt = info.results.some((row) => String(row.name) === "deleted_at");
  const where = hasDeletedAt ? "WHERE deleted_at IS NULL" : "";
  /* Shirt number, the way a roster is read out.

     It used to sort by unit first, which grouped the squad into Offense,
     Defense and Special Teams before anything else had a say. That was the
     right order while the pages showed those three groups. They show one
     roster now, and a hidden sort by a field nobody can see would have put
     the groups back in — same blocks, no headings to explain them.

     Players without a number go last rather than first: in SQLite NULL sorts
     ahead of every number, so without the CASE the roster would open on
     whoever has not been given a shirt yet. */
  const result = await DB.prepare(`SELECT * FROM players ${where}
    ORDER BY active DESC,
      CASE WHEN jersey_number IS NULL THEN 1 ELSE 0 END,
      jersey_number,
      last_name,
      first_name`).all<Record<string, unknown>>();
  return result.results.map(mapPlayer);
}
