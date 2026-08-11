import { bindings } from "./cms";
import { ensureFootballSchema, mapPlayer } from "./football";

export async function listPublicTeamPlayers() {
  await ensureFootballSchema();
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(players)").all<Record<string, unknown>>();
  const hasDeletedAt = info.results.some((row) => String(row.name) === "deleted_at");
  const where = hasDeletedAt ? "WHERE deleted_at IS NULL" : "";
  const result = await DB.prepare(`SELECT * FROM players ${where} ORDER BY active DESC, unit, position, jersey_number, last_name, first_name`).all<Record<string, unknown>>();
  return result.results.map(mapPlayer);
}
