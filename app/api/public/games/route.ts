import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { mediaUrlForKey, normalizeMediaUrl } from "../../../lib/media-url";

const OFFICIAL_LOGO_FALLBACKS = new Map<string, string>([
  ["neckar hammers", "https://hammers.de/wp-content/uploads/2025/11/Neckar_Hammers_Logo_White_Transparent.png"],
]);

async function ensureTrashColumn() {
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(games)").all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === "deleted_at")) await DB.prepare("ALTER TABLE games ADD COLUMN deleted_at TEXT").run();
}

function opponentKey(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("de-DE");
}

function searchKey(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function opponentTokens(value: unknown) {
  return searchKey(value).split(/\s+/).filter((token) => token.length >= 4);
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

async function recoverMissingOpponentLogos(rows: Record<string, unknown>[], logos: Map<string, string>) {
  const missing = Array.from(new Set(rows
    .map((row) => String(row.opponent ?? "").trim())
    .filter((opponent) => opponent && !logos.get(opponentKey(opponent)))));
  if (!missing.length) return;

  try {
    const { MEDIA } = bindings();
    const listed = await MEDIA.list({ prefix: "uploads/", limit: 1000 });
    const media = listed.objects.map((object) => ({
      key: object.key,
      searchable: searchKey(`${object.key} ${object.customMetadata?.originalName ?? ""}`),
    }));

    for (const opponent of missing) {
      const tokens = opponentTokens(opponent);
      if (!tokens.length) continue;
      const exact = searchKey(opponent);
      let best: { key: string; score: number } | null = null;

      for (const object of media) {
        if (!tokens.every((token) => object.searchable.includes(token))) continue;
        const score = (object.searchable.includes(exact) ? 10 : 0) + tokens.length;
        if (!best || score > best.score) best = { key: object.key, score };
      }

      if (best) logos.set(opponentKey(opponent), mediaUrlForKey(best.key));
    }
  } catch {
    // A missing media lookup must never break the public schedule.
  }
}

function applyOfficialLogoFallbacks(rows: Record<string, unknown>[], logos: Map<string, string>) {
  for (const row of rows) {
    const key = opponentKey(row.opponent);
    if (!key || logos.get(key)) continue;
    const fallback = OFFICIAL_LOGO_FALLBACKS.get(key);
    if (fallback) logos.set(key, fallback);
  }
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
  await recoverMissingOpponentLogos(rows, logos);
  applyOfficialLogoFallbacks(rows, logos);
  return Response.json({
    items: rows.map((row) => mapGame(row, logos)),
    league: String(team?.league ?? "Bezirksliga"),
    season: Number(team?.season ?? 2026),
  }, { headers: { "cache-control": "no-store" } });
}
