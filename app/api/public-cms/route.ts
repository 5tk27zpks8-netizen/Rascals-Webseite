import { readCmsState } from "../../lib/cms";

export async function GET() {
  const state = await readCmsState();
  return Response.json(state, {
    headers: {
      "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=300",
    },
  });
}
