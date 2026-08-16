import { bindings } from "../../lib/cms";
import { mediaUrlForKey } from "../../lib/media-url";
import { requireCmsPermission } from "../../lib/permissions";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const actor = await requireCmsPermission("media");
  if (actor instanceof Response) return actor;

  const { MEDIA } = bindings();
  const listed = await MEDIA.list({ prefix: "uploads/", limit: 1000 });
  return Response.json({
    items: listed.objects.map((object) => ({
      key: object.key,
      url: mediaUrlForKey(object.key),
      size: object.size,
      uploaded: object.uploaded.toISOString(),
      contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
      originalName: object.customMetadata?.originalName ?? object.key.split("/").pop() ?? object.key,
      uploadedBy: object.customMetadata?.uploadedBy ?? "",
    })),
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("media");
  if (actor instanceof Response) return actor;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: "Unsupported file type" }, { status: 415 });
  if (file.size > MAX_FILE_SIZE) return Response.json({ error: "File exceeds 15 MB" }, { status: 413 });

  const replaceKey = String(formData.get("replaceKey") ?? "");
  const extSafeName = safeName(file.name) || `image-${Date.now()}.webp`;
  const key = replaceKey.startsWith("uploads/")
    ? replaceKey
    : `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${extSafeName}`;
  const { MEDIA } = bindings();
  await MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { originalName: file.name, uploadedBy: actor.email },
  });

  return Response.json({ key, url: mediaUrlForKey(key), replaced: Boolean(replaceKey) }, {
    status: replaceKey ? 200 : 201,
    headers: { "cache-control": "no-store" },
  });
}

export async function DELETE(request: Request) {
  const actor = await requireCmsPermission("media");
  if (actor instanceof Response) return actor;

  const key = new URL(request.url).searchParams.get("key");
  if (!key || !key.startsWith("uploads/")) return Response.json({ error: "Invalid key" }, { status: 400 });
  const { MEDIA } = bindings();
  await MEDIA.delete(key);
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
