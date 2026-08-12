import { readSiteBuilderState } from "../../lib/site-builder";

export async function GET() {
  return Response.json(await readSiteBuilderState(), {
    headers: { "cache-control": "public, max-age=30, stale-while-revalidate=120" },
  });
}
