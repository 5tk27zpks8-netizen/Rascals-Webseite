import { getChatGPTUser } from "../../chatgpt-auth";
import { readCmsState, writeCmsState, type CmsState } from "../../lib/cms";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const state = await readCmsState();
  return Response.json({ state, user: { email: user.email, name: user.displayName } });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
  return Response.json({ ok: true, savedAt: new Date().toISOString() });
}
