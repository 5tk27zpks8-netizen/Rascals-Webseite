import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { normalizeMediaUrl } from "../../../lib/media-url";

async function ensureTrashColumn() {
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(games)").all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === "deleted_at")) await DB.prepare("ALTER TABLE games ADD COLUMN deleted_at TEXT").run();
}

function opponentKey(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("de-DE");
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

function canonicalOpponentLogos(rows: Record<string, unknown>[]) {
  const logos = new Map<string, string>();
  for (const row of rows) {
    const key = opponentKey(row.opponent);
    const candidate = normalizeMediaUrl(String(row.opponent_logo ?? ""));
    if (!key || !candidate) continue;
    const current = logos.get(key) ?? "";
    if (logoScore(candidate) > logoScore(current)) logos.set(key, candidate);
  }
  return logos;
}

function mapGame(row: Record<string, unknown>, logos: Map<string, string>) {
  const opponent = String(row.opponent ?? "");
  const storedLogo = normalizeMediaUrl(String(row.opponent_logo ?? ""));
  const canonicalLogo = logos.get(opponentKey(opponent)) ?? "";
  const opponentLogo = logoScore(canonicalLogo) >= logoScore(storedLogo) ? canonicalLogo : storedLogo;
  return {
    id: String(row.id),
    slug: String(row.slug),
    opponent,
    opponentLogo,
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
  await ensureTrashColumn();
  const { DB } = bindings();
  const [result, team] = await Promise.all([
    DB.prepare(`SELECT * FROM games WHERE status <> 'cancelled' AND deleted_at IS NULL ORDER BY COALESCE(kickoff,'9999-12-31') ASC, created_at DESC`).all(),
    DB.prepare("SELECT league,season FROM teams WHERE id='mens' LIMIT 1").first<Record<string, unknown>>(),
  ]);
  const rows = result.results.map((row) => row as Record<string, unknown>);
  const logos = canonicalOpponentLogos(rows);
  return Response.json({
    items: rows.map((row) => mapGame(row, logos)),
    league: String(team?.league ?? "Bezirksliga"),
    season: Number(team?.season ?? 2026),
  }, { headers: { "cache-control": "no-store" } });
}
