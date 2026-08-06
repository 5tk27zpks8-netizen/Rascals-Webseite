import { bindings } from "./cms";

export type PublicNewsPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  publishedAt: string | null;
};

export async function ensureNewsSchema() {
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

function mapPost(row: Record<string, unknown>): PublicNewsPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: String(row.excerpt ?? ""),
    content: String(row.content ?? ""),
    image: String(row.image ?? ""),
    category: String(row.category ?? "Team"),
    publishedAt: row.published_at ? String(row.published_at) : null,
  };
}

export async function listPublishedNews(limit = 100): Promise<PublicNewsPost[]> {
  await ensureNewsSchema();
  const { DB } = bindings();
  const result = await DB.prepare(`SELECT id, slug, title, excerpt, content, image, category, published_at
    FROM news_posts
    WHERE status = 'published'
    ORDER BY published_at DESC
    LIMIT ?`).bind(limit).all();
  return result.results.map((row) => mapPost(row as Record<string, unknown>));
}

export async function getPublishedNewsBySlug(slug: string): Promise<PublicNewsPost | null> {
  await ensureNewsSchema();
  const { DB } = bindings();
  const row = await DB.prepare(`SELECT id, slug, title, excerpt, content, image, category, published_at
    FROM news_posts
    WHERE slug = ? AND status = 'published'
    LIMIT 1`).bind(slug).first();
  return row ? mapPost(row as Record<string, unknown>) : null;
}
