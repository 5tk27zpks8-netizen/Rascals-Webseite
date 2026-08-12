import { bindings } from "./cms";
import { ensureFootballSchema, mapGame } from "./football";

export async function listVisibleGames() {
  await ensureFootballSchema();
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(games)").all<Record<string, unknown>>();
  const hasDeletedAt = info.results.some((row) => String(row.name) === "deleted_at");
  const where = hasDeletedAt ? "WHERE deleted_at IS NULL AND status <> 'cancelled'" : "WHERE status <> 'cancelled'";
  const result = await DB.prepare(`SELECT * FROM games ${where} ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, COALESCE(kickoff,'9999-12-31') ASC`).all<Record<string, unknown>>();
  return result.results.map(mapGame);
}
