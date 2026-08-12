import { readPublishedSiteBuilderState } from "../../lib/site-builder";

export async function GET() {
  return Response.json(await readPublishedSiteBuilderState(), {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" },
  });
}
