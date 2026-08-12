import { bindings } from "../../../lib/cms";
import { ensureFootballSchema } from "../../../lib/football";

async function ensureTrashColumn() {
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(games)").all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === "deleted_at")) await DB.prepare("ALTER TABLE games ADD COLUMN deleted_at TEXT").run();
}
function mapGame(row:Record<string,unknown>){return{id:String(row.id),slug:String(row.slug),opponent:String(row.opponent??""),opponentLogo:String(row.opponent_logo??""),venue:String(row.venue??""),homeAway:String(row.home_away??"home"),kickoff:row.kickoff?String(row.kickoff):null,status:String(row.status??"upcoming"),rascalsScore:Number(row.rascals_score??0),opponentScore:Number(row.opponent_score??0),quarter:String(row.quarter??"")}}
export async function GET(){await ensureFootballSchema();await ensureTrashColumn();const{DB}=bindings();const[result,team]=await Promise.all([DB.prepare(`SELECT * FROM games WHERE status <> 'cancelled' AND deleted_at IS NULL ORDER BY COALESCE(kickoff,'9999-12-31') ASC, created_at DESC`).all(),DB.prepare("SELECT league,season FROM teams WHERE id='mens' LIMIT 1").first<Record<string,unknown>>()]);return Response.json({items:result.results.map(row=>mapGame(row as Record<string,unknown>)),league:String(team?.league??"Bezirksliga"),season:Number(team?.season??2026)},{headers:{"cache-control":"public, max-age=30, stale-while-revalidate=60"}})}
