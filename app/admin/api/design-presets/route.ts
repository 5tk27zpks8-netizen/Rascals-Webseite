import { readCustomDesignPresets, writeCustomDesignPresets } from "../../../lib/design-preset-store";
import type { DesignPreset } from "../../../lib/design-presets";
import { requireCmsPermission } from "../../../lib/permissions";

export async function GET() {
  const actor = await requireCmsPermission("hero");
  if (actor instanceof Response) return actor;
  return Response.json({ items: await readCustomDesignPresets() });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("hero");
  if (actor instanceof Response) return actor;
  let body: { items?: DesignPreset[] };
  try {
    body = await request.json() as { items?: DesignPreset[] };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.items)) return Response.json({ error: "Designs are required" }, { status: 400 });
  const items = await writeCustomDesignPresets(body.items);
  return Response.json({ ok: true, items, savedBy: actor.email, savedAt: new Date().toISOString() });
}
