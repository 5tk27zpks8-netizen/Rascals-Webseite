import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";
import { requireCmsPermission } from "../../../lib/permissions";

type TrackingBody = {
  playerId?: string;
  category?: string;
  metricKey?: string;
  metricLabel?: string;
  value?: number;
  unit?: string;
  measuredAt?: string;
  note?: string;
};

async function ensureTrackingSchema() {
  const { DB } = bindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS athletic_tracking (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      category TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      metric_label TEXT NOT NULL,
      metric_value REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT '',
      measured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_athletic_tracking_player ON athletic_tracking(player_id, measured_at DESC)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS idx_athletic_tracking_metric ON athletic_tracking(metric_key, measured_at DESC)"),
  ]);
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureTrackingSchema();
  const { DB } = bindings();
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId") ?? "";
  const players = await DB.prepare(`SELECT id,first_name,last_name,jersey_number,position,unit,portrait
    FROM players WHERE active=1 AND deleted_at IS NULL ORDER BY last_name,first_name`).all<Record<string, unknown>>();
  const entries = playerId
    ? await DB.prepare(`SELECT t.*,p.first_name,p.last_name,p.jersey_number,p.position
        FROM athletic_tracking t JOIN players p ON p.id=t.player_id
        WHERE t.player_id=? ORDER BY datetime(t.measured_at) DESC, datetime(t.created_at) DESC LIMIT 100`).bind(playerId).all<Record<string, unknown>>()
    : await DB.prepare(`SELECT t.*,p.first_name,p.last_name,p.jersey_number,p.position
        FROM athletic_tracking t JOIN players p ON p.id=t.player_id
        ORDER BY datetime(t.measured_at) DESC, datetime(t.created_at) DESC LIMIT 100`).all<Record<string, unknown>>();
  return Response.json({
    players: players.results.map(p => ({
      id: String(p.id), firstName: String(p.first_name), lastName: String(p.last_name), jerseyNumber: p.jersey_number == null ? null : Number(p.jersey_number),
      position: String(p.position ?? ""), unit: String(p.unit ?? ""), portrait: String(p.portrait ?? ""),
    })),
    entries: entries.results.map(r => ({
      id: String(r.id), playerId: String(r.player_id), firstName: String(r.first_name), lastName: String(r.last_name), jerseyNumber: r.jersey_number == null ? null : Number(r.jersey_number), position: String(r.position ?? ""),
      category: String(r.category), metricKey: String(r.metric_key), metricLabel: String(r.metric_label), value: Number(r.metric_value), unit: String(r.unit ?? ""), measuredAt: String(r.measured_at), note: String(r.note ?? ""), createdBy: String(r.created_by ?? ""),
    })),
  });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("performance");
  if (actor instanceof Response) return actor;
  await ensureFootballSchema();
  await ensureTrackingSchema();
  const body = await request.json() as TrackingBody;
  if (!body.playerId || !body.category?.trim() || !body.metricKey?.trim() || !body.metricLabel?.trim() || !Number.isFinite(Number(body.value))) {
    return Response.json({ error: "Spieler, Kategorie, Messwert und Wert sind erforderlich." }, { status: 400 });
  }
  const { DB } = bindings();
  const player = await DB.prepare("SELECT id FROM players WHERE id=? AND active=1 AND deleted_at IS NULL LIMIT 1").bind(body.playerId).first();
  if (!player) return Response.json({ error: "Spieler wurde nicht gefunden." }, { status: 404 });
  const id = crypto.randomUUID();
  const measuredAt = body.measuredAt?.trim() || new Date().toISOString();
  await DB.prepare(`INSERT INTO athletic_tracking (id,player_id,category,metric_key,metric_label,metric_value,unit,measured_at,note,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
      id, body.playerId, body.category.trim(), body.metricKey.trim(), body.metricLabel.trim(), Number(body.value), body.unit?.trim() ?? "", measuredAt, body.note?.trim() ?? "", actor.email,
    ).run();
  return Response.json({ ok: true, id }, { status: 201 });
}
