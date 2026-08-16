import { bindings } from "./cms";
import { ensureFootballSchema, mapGame, type Game } from "./football";
import { normalizeMediaUrl } from "./media-url";

function opponentKey(value: string) {
  return value.trim().toLocaleLowerCase("de-DE");
}

function logoScore(value: string) {
  const normalized = normalizeMediaUrl(value);
  if (!normalized) return 0;
  if (normalized.startsWith("/media/")) return 5;
  if (normalized.startsWith("/")) return 4;
  if (normalized.startsWith("https://")) return 3;
  if (normalized.startsWith("http://")) return 2;
  return 1;
}

function normalizeGameLogos(games: Game[]) {
  const canonical = new Map<string, string>();
  for (const game of games) {
    const key = opponentKey(game.opponent);
    const candidate = normalizeMediaUrl(game.opponentLogo);
    const current = canonical.get(key) ?? "";
    if (key && logoScore(candidate) > logoScore(current)) canonical.set(key, candidate);
  }
  return games.map((game) => {
    const stored = normalizeMediaUrl(game.opponentLogo);
    const preferred = canonical.get(opponentKey(game.opponent)) ?? "";
    return { ...game, opponentLogo: logoScore(preferred) >= logoScore(stored) ? preferred : stored };
  });
}

export async function listVisibleGames() {
  await ensureFootballSchema();
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(games)").all<Record<string, unknown>>();
  const hasDeletedAt = info.results.some((row) => String(row.name) === "deleted_at");
  const where = hasDeletedAt ? "WHERE deleted_at IS NULL AND status <> 'cancelled'" : "WHERE status <> 'cancelled'";
  const result = await DB.prepare(`SELECT * FROM games ${where} ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, COALESCE(kickoff,'9999-12-31') ASC`).all<Record<string, unknown>>();
  return normalizeGameLogos(result.results.map(mapGame));
}
