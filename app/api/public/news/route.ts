import { listPublishedNews } from "../../../lib/news";

export async function GET() {
  const items = await listPublishedNews(3);
  return Response.json({ items });
}
