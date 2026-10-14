import { notFound } from "next/navigation";
import { getPublishedNewsBySlug, listRelatedNews } from "../../lib/news";
import "../news-public.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const post = await getPublishedNewsBySlug(slug);
  if (!post) return { title: "News nicht gefunden · Hellenstein Rascals" };
  const image = post.ogImage || post.image;
  return { title: `${post.seoTitle || post.title} · Hellenstein Rascals`, description: post.seoDescription || post.excerpt, openGraph: image ? { images: [image] } : undefined };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const post = await getPublishedNewsBySlug(slug); if (!post) notFound();
  const related = await listRelatedNews(post);
  return <main className="public-news-detail">
    <header className="public-news-detail-hero">{post.image&&<img src={post.image} alt=""/>}<div className="public-news-detail-shade"/><div><a href="/news">← Alle News</a><span>{post.category} · {post.publishedAt?new Date(post.publishedAt).toLocaleDateString("de-DE"):""}{post.author?` · ${post.author}`:""}</span><h1>{post.title}</h1>{post.subtitle&&<h2>{post.subtitle}</h2>}<p>{post.excerpt}</p></div></header>
    <article className="public-news-article">{renderMarkdown(post.content)}</article>
    {post.gallery.length>0&&<section className="public-news-gallery">{post.gallery.map(url=><img key={url} src={url} alt=""/>)}</section>}
    {related.length>0&&<section className="public-news-related"><h2>Weitere News</h2><div>{related.map(item=><a key={item.id} href={`/news/${item.slug}`}>{item.image&&<img src={item.image} alt=""/>}<span>{item.category}</span><b>{item.title}</b></a>)}</div></section>}
  </main>;
}

function renderMarkdown(content:string){return content.split(/\n{2,}/).map((block,index)=>{const text=block.trim();if(!text)return null;if(text==="---")return <hr key={index}/>;if(text.startsWith("## "))return <h2 key={index}>{inline(text.slice(3))}</h2>;if(text.startsWith("> "))return <blockquote key={index}>{inline(text.slice(2))}</blockquote>;if(text.split("\n").every(line=>line.startsWith("- ")))return <ul key={index}>{text.split("\n").map((line,i)=><li key={i}>{inline(line.slice(2))}</li>)}</ul>;return <p key={index}>{inline(text)}</p>})}
function inline(value:string){const parts=value.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);return parts.map((part,i)=>{if(/^\*\*.*\*\*$/.test(part))return <strong key={i}>{part.slice(2,-2)}</strong>;if(/^\*.*\*$/.test(part))return <em key={i}>{part.slice(1,-1)}</em>;const m=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);if(m)return <a key={i} href={m[2]}>{m[1]}</a>;return part})}
