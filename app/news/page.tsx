import { countPublishedNews, listNewsCategories, listPublishedNews } from "../lib/news";
import { Header } from "../SiteShell";
import "./news-public.css";

export const metadata = { title: "News · Hellenstein Rascals", description: "Aktuelle News, Spielberichte und Vereinsmeldungen der Hellenstein Rascals." };

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = 9;
  const [posts, total, categories] = await Promise.all([
    listPublishedNews(pageSize, (page - 1) * pageSize, category, q),
    countPublishedNews(category, q),
    listNewsCategories(),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return <>
    <Header page="news" />
    <main className="public-news-page">
    <header className="public-news-hero"><span>INSIDE RASCALS</span><h1>FROM THE <i>HUDDLE.</i></h1><p>Spielberichte, Team-News, Vereinsleben und aktuelle Meldungen.</p></header>
    <form className="public-news-filters" method="get"><input name="q" defaultValue={q} placeholder="News durchsuchen…"/><select name="category" defaultValue={category}><option value="">Alle Kategorien</option>{categories.map((item)=><option key={item}>{item}</option>)}</select><button type="submit">Filtern</button></form>
    <section className="public-news-grid">
      {posts.map(post=><article key={post.id} className="public-news-card"><a href={`/news/${post.slug}`}><div className="public-news-image">{post.image?<img src={post.image} alt=""/>:<div className="public-news-placeholder">RASCALS</div>}</div><div className="public-news-copy"><span>{post.category} · {post.publishedAt?new Date(post.publishedAt).toLocaleDateString("de-DE"):""}</span><h2>{post.title}</h2>{post.subtitle&&<b>{post.subtitle}</b>}<p>{post.excerpt}</p><strong>Story lesen →</strong></div></a></article>)}
      {!posts.length&&<div className="public-news-empty"><b>Keine Beiträge gefunden.</b><p>Filter anpassen oder später erneut vorbeischauen.</p></div>}
    </section>
    {pages>1&&<nav className="public-news-pagination">{Array.from({length:pages},(_,i)=>i+1).map(p=><a key={p} className={p===page?"active":""} href={`?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&page=${p}`}>{p}</a>)}</nav>}
  </main>
  </>;
}
