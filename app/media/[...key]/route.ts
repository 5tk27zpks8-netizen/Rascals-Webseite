import { bindings } from "../../lib/cms";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key } = await context.params;
  const objectKey = key.map(decodeURIComponent).join("/");
  if (!objectKey.startsWith("uploads/")) {
    return new Response("Not found", { status: 404 });
  }

  const { MEDIA } = bindings();
  const object = await MEDIA.get(objectKey);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", object.httpMetadata?.cacheControl ?? "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
