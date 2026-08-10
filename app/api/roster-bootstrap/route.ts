import { ensureFootballSchema } from "../../lib/football";
import { ensureInitialRoster } from "../../lib/roster-seed";

export async function GET() {
  await ensureFootballSchema();
  await ensureInitialRoster();
  return Response.json({ ok: true, message: "Rascals Spielerprofile wurden angelegt." });
}
