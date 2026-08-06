import { getChatGPTUser } from "../../chatgpt-auth";
import { bindings } from "../../lib/cms";

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

async function ensureNewsSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS news_posts (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Team',
    status TEXT NOT NULL DEFAULT 'draft',
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function rowToPost(row: Record<string, unknown>): NewsPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    content: String(row.content ?? ""),
    image: String(row.image ?? ""),
    category: String(row.category ?? "Team"),
    status: row.status === "published" ? "published" : "draft",
    publishedAt: row.published_at ? String(row.published_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureNewsSchema();
  const { DB } = bindings();
  const result = await DB.prepare("SELECT * FROM news_posts ORDER BY COALESCE(published_at, created_at) DESC").all();
  return Response.json({ items: result.results.map((row) => rowToPost(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureNewsSchema();
  const body = await request.json() as Partial<NewsPost>;
  if (!body.title?.trim()) return Response.json({ error: "Title is required" }, { status: 400 });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const slug = slugify(body.slug || body.title) || id;
  const status = body.status === "published" ? "published" : "draft";
  const publishedAt = status === "published" ? (body.publishedAt || now) : null;
  const { DB } = bindings();

  await DB.prepare(`INSERT INTO news_posts
    (id, slug, title, excerpt, content, image, category, status, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, slug, body.title.trim(), body.excerpt ?? "", body.content ?? "", body.image ?? "", body.category ?? "Team", status, publishedAt, now, now)
    .run();

  const row = await DB.prepare("SELECT * FROM news_posts WHERE id = ?").bind(id).first();
  return Response.json({ item: rowToPost(row as Record<string, unknown>) }, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureNewsSchema();
  const body = await request.json() as Partial<NewsPost>;
  if (!body.id) return Response.json({ error: "ID is required" }, { status: 400 });
  if (!body.title?.trim()) return Response.json({ error: "Title is required" }, { status: 400 });

  const status = body.status === "published" ? "published" : "draft";
  const publishedAt = status === "published" ? (body.publishedAt || new Date().toISOString()) : null;
  const slug = slugify(body.slug || body.title) || body.id;
  const { DB } = bindings();

  await DB.prepare(`UPDATE news_posts SET
    slug = ?, title = ?, excerpt = ?, content = ?, image = ?, category = ?, status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .bind(slug, body.title.trim(), body.excerpt ?? "", body.content ?? "", body.image ?? "", body.category ?? "Team", status, publishedAt, body.id)
    .run();

  const row = await DB.prepare("SELECT * FROM news_posts WHERE id = ?").bind(body.id).first();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ item: rowToPost(row as Record<string, unknown>) });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureNewsSchema();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID is required" }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare("DELETE FROM news_posts WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
