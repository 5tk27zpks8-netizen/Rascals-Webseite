import { bindings } from "../../../lib/cms";
import { ensureFootballSchema, slugify } from "../../../lib/football";
import { requireCmsPermission } from "../../../lib/permissions";

type GameBody = {
  id?: string;
  slug?: string;
  opponent?: string;
  opponentLogo?: string;
  venue?: string;
  homeAway?: "home" | "away";
  kickoff?: string | null;
  status?: "upcoming" | "live" | "final" | "postponed" | "cancelled";
  rascalsScore?: number;
  opponentScore?: number;
  quarter?: string;
  gameClock?: string;
  gamedayAssignee?: string;
};

async function ensureAssignments() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS game_gameday_assignments (
    game_id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

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
    gameClock: String(row.game_clock ?? ""),
    gamedayAssignee: String(row.gameday_assignee ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

async function authorize() {
  return requireCmsPermission("games");
}

async function saveAssignment(gameId: string, email?: string) {
  const { DB } = bindings();
  const normalized = email?.trim().toLowerCase() ?? "";
  if (!normalized) {
    await DB.prepare("DELETE FROM game_gameday_assignments WHERE game_id=?").bind(gameId).run();
    return;
  }
  await DB.prepare(`INSERT INTO game_gameday_assignments (game_id,user_email,assigned_at)
    VALUES (?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(game_id) DO UPDATE SET user_email=excluded.user_email, assigned_at=CURRENT_TIMESTAMP`)
    .bind(gameId, normalized).run();
}

async function getGame(id: string) {
  const { DB } = bindings();
  return DB.prepare(`SELECT g.*, COALESCE(a.user_email,'') AS gameday_assignee
    FROM games g LEFT JOIN game_gameday_assignments a ON a.game_id=g.id
    WHERE g.id=? LIMIT 1`).bind(id).first<Record<string, unknown>>();
}

export async function GET() {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureAssignments();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT g.*, COALESCE(a.user_email,'') AS gameday_assignee
    FROM games g LEFT JOIN game_gameday_assignments a ON a.game_id=g.id
    ORDER BY COALESCE(g.kickoff,'9999-12-31') ASC, g.created_at DESC`).all();
  return Response.json({ items: result.results.map((row) => mapGame(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureAssignments();
  const body = await request.json() as GameBody;
  if (!body.opponent?.trim()) return Response.json({ error: "Gegner ist erforderlich." }, { status: 400 });
  const id = crypto.randomUUID();
  const slug = slugify(body.slug || `${body.opponent}-${body.kickoff ?? id}`) || id;
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO games (id,slug,opponent,opponent_logo,venue,home_away,kickoff,status,rascals_score,opponent_score,quarter,game_clock)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, slug, body.opponent.trim(), body.opponentLogo ?? "", body.venue ?? "", body.homeAway ?? "home", body.kickoff ?? null,
      body.status ?? "upcoming", Number(body.rascalsScore ?? 0), Number(body.opponentScore ?? 0), body.quarter ?? "", body.gameClock ?? ""
    ).run();
  await saveAssignment(id, body.gamedayAssignee);
  const row = await getGame(id);
  return Response.json({ item: mapGame(row!) }, { status: 201 });
}

export async function PUT(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureAssignments();
  const body = await request.json() as GameBody;
  if (!body.id || !body.opponent?.trim()) return Response.json({ error: "ID und Gegner sind erforderlich." }, { status: 400 });
  const slug = slugify(body.slug || `${body.opponent}-${body.kickoff ?? body.id}`) || body.id;
  const { DB } = bindings();
  await DB.prepare(`UPDATE games SET slug=?,opponent=?,opponent_logo=?,venue=?,home_away=?,kickoff=?,status=?,rascals_score=?,opponent_score=?,quarter=?,game_clock=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(
    slug, body.opponent.trim(), body.opponentLogo ?? "", body.venue ?? "", body.homeAway ?? "home", body.kickoff ?? null,
    body.status ?? "upcoming", Number(body.rascalsScore ?? 0), Number(body.opponentScore ?? 0), body.quarter ?? "", body.gameClock ?? "", body.id
  ).run();
  await saveAssignment(body.id, body.gamedayAssignee);
  const row = await getGame(body.id);
  if (!row) return Response.json({ error: "Spiel nicht gefunden." }, { status: 404 });
  return Response.json({ item: mapGame(row) });
}

export async function DELETE(request: Request) {
  const actor = await authorize();
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureAssignments();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID fehlt." }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare("DELETE FROM game_gameday_assignments WHERE game_id=?").bind(id).run();
  await DB.prepare("DELETE FROM game_events WHERE game_id=?").bind(id).run();
  await DB.prepare("DELETE FROM games WHERE id=?").bind(id).run();
  return Response.json({ ok: true });
}
