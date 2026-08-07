import { readCmsState, writeCmsState, type CmsState } from "../../lib/cms";
import { requireCmsPermission } from "../../lib/permissions";

export async function GET() {
  const actor = await requireCmsPermission("hero");
  if (actor instanceof Response) return actor;
  const state = await readCmsState();
  return Response.json({ state, user: actor });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("hero");
  if (actor instanceof Response) return actor;

  let state: CmsState;
  try {
    state = (await request.json()) as CmsState;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(state.slides) || state.slides.length < 1) {
    return Response.json({ error: "At least one hero slide is required" }, { status: 400 });
  }

  await writeCmsState(state);
  return Response.json({ ok: true, savedAt: new Date().toISOString(), savedBy: actor.email });
}
