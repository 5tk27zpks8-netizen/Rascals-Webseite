import { bindings } from "../../lib/cms";
import { requireCmsPermission } from "../../lib/permissions";

export type NewsStatus = "draft" | "scheduled" | "published" | "archived";

export type NewsPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  image: string;
  gallery: string[];
  category: string;
  author: string;
  status: NewsStatus;
  publishAt: string | null;
  publishedAt: string | null;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  createdAt: string;
  updatedAt: string;
};

async function ensureColumn(name: string, definition: string) {
  const { DB } = bindings();
  const info = await DB.prepare("PRAGMA table_info(news_posts)").all<Record<string, unknown>>();
  if (!info.results.some((row) => String(row.name) === name)) {
    await DB.prepare(`ALTER TABLE news_posts ADD COLUMN ${name} ${definition}`).run();
  }
}

export async function ensureNewsSchema() {
  const { DB } = bindings();
  await DB.prepare(`CREATE TABLE IF NOT EXISTS news_posts (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    gallery TEXT NOT NULL DEFAULT '[]',
    category TEXT NOT NULL DEFAULT 'Team',
    author TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    publish_at TEXT,
    published_at TEXT,
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    og_image TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await ensureColumn("subtitle", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("gallery", "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn("author", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("publish_at", "TEXT");
  await ensureColumn("seo_title", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("seo_description", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("og_image", "TEXT NOT NULL DEFAULT ''");
}

function rowToPost(row: Record<string, unknown>): NewsPost {
  let gallery: string[] = [];
  try { gallery = JSON.parse(String(row.gallery ?? "[]")); } catch { gallery = []; }
  const rawStatus = String(row.status ?? "draft");
  const status: NewsStatus = ["scheduled", "published", "archived"].includes(rawStatus) ? rawStatus as NewsStatus : "draft";
  return {
    id: String(row.id), slug: String(row.slug), title: String(row.title), subtitle: String(row.subtitle ?? ""),
    excerpt: String(row.excerpt ?? ""), content: String(row.content ?? ""), image: String(row.image ?? ""), gallery,
    category: String(row.category ?? "Team"), author: String(row.author ?? ""), status,
    publishAt: row.publish_at ? String(row.publish_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    seoTitle: String(row.seo_title ?? ""), seoDescription: String(row.seo_description ?? ""), ogImage: String(row.og_image ?? ""),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function normalizeStatus(value: unknown): NewsStatus {
  return ["scheduled", "published", "archived"].includes(String(value)) ? String(value) as NewsStatus : "draft";
}

async function uniqueSlug(base: string, id?: string) {
  const { DB } = bindings();
  let candidate = base || crypto.randomUUID();
  let suffix = 2;
  while (true) {
    const found = await DB.prepare("SELECT id FROM news_posts WHERE slug = ? LIMIT 1").bind(candidate).first<{ id: string }>();
    if (!found || found.id === id) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export async function GET(request: Request) {
  const actor = await requireCmsPermission("news");
  if (actor instanceof Response) return actor;
  await ensureNewsSchema();
  const { DB } = bindings();
  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const result = query
    ? await DB.prepare("SELECT * FROM news_posts WHERE lower(title) LIKE ? OR lower(category) LIKE ? ORDER BY updated_at DESC").bind(`%${query}%`, `%${query}%`).all()
    : await DB.prepare("SELECT * FROM news_posts ORDER BY updated_at DESC").all();
  return Response.json({ items: result.results.map((row) => rowToPost(row as Record<string, unknown>)), user: actor });
}

export async function POST(request: Request) {
  const actor = await requireCmsPermission("news");
  if (actor instanceof Response) return actor;
  await ensureNewsSchema();
  const body = await request.json() as Partial<NewsPost>;
  if (!body.title?.trim()) return Response.json({ error: "Title is required" }, { status: 400 });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = normalizeStatus(body.status);
  const slug = await uniqueSlug(slugify(body.slug || body.title));
  const publishAt = status === "scheduled" ? (body.publishAt || now) : null;
  const publishedAt = status === "published" ? (body.publishedAt || now) : null;
  const { DB } = bindings();
  await DB.prepare(`INSERT INTO news_posts
    (id,slug,title,subtitle,excerpt,content,image,gallery,category,author,status,publish_at,published_at,seo_title,seo_description,og_image,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, slug, body.title.trim(), body.subtitle ?? "", body.excerpt ?? "", body.content ?? "", body.image ?? "", JSON.stringify(body.gallery ?? []), body.category ?? "Team", body.author || actor.name || actor.email, status, publishAt, publishedAt, body.seoTitle ?? "", body.seoDescription ?? "", body.ogImage ?? "", now, now)
    .run();
  const row = await DB.prepare("SELECT * FROM news_posts WHERE id = ?").bind(id).first<Record<string, unknown>>();
  return Response.json({ item: rowToPost(row ?? {}) }, { status: 201 });
}

export async function PUT(request: Request) {
  const actor = await requireCmsPermission("news");
  if (actor instanceof Response) return actor;
  await ensureNewsSchema();
  const body = await request.json() as Partial<NewsPost>;
  if (!body.id || !body.title?.trim()) return Response.json({ error: "ID and title are required" }, { status: 400 });
  const status = normalizeStatus(body.status);
  const slug = await uniqueSlug(slugify(body.slug || body.title), body.id);
  const publishAt = status === "scheduled" ? (body.publishAt || new Date().toISOString()) : null;
  const publishedAt = status === "published" ? (body.publishedAt || new Date().toISOString()) : body.publishedAt ?? null;
  const { DB } = bindings();
  await DB.prepare(`UPDATE news_posts SET slug=?,title=?,subtitle=?,excerpt=?,content=?,image=?,gallery=?,category=?,author=?,status=?,publish_at=?,published_at=?,seo_title=?,seo_description=?,og_image=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(slug, body.title.trim(), body.subtitle ?? "", body.excerpt ?? "", body.content ?? "", body.image ?? "", JSON.stringify(body.gallery ?? []), body.category ?? "Team", body.author || actor.name || actor.email, status, publishAt, publishedAt, body.seoTitle ?? "", body.seoDescription ?? "", body.ogImage ?? "", body.id)
    .run();
  const row = await DB.prepare("SELECT * FROM news_posts WHERE id = ?").bind(body.id).first<Record<string, unknown>>();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ item: rowToPost(row) });
}

export async function DELETE(request: Request) {
  const actor = await requireCmsPermission("news");
  if (actor instanceof Response) return actor;
  await ensureNewsSchema();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "ID is required" }, { status: 400 });
  const { DB } = bindings();
  await DB.prepare("DELETE FROM news_posts WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
