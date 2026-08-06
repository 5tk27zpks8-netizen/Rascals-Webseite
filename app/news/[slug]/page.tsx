import { notFound } from "next/navigation";
import { getPublishedNewsBySlug } from "../../lib/news";
import "../news-public.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedNewsBySlug(slug);
  if (!post) return { title: "News nicht gefunden · Hellenstein Rascals" };
  return {
    title: `${post.title} · Hellenstein Rascals`,
    description: post.excerpt,
    openGraph: post.image ? { images: [post.image] } : undefined,
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedNewsBySlug(slug);
  if (!post) notFound();

  const paragraphs = post.content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <main className="public-news-detail">
      <header className="public-news-detail-hero">
        {post.image && <img src={post.image} alt="" />}
        <div className="public-news-detail-shade" />
        <div>
          <a href="/news">← Alle News</a>
          <span>{post.category} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("de-DE") : ""}</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
        </div>
      </header>
      <article className="public-news-article">
        {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </article>
    </main>
  );
}
