import { listPublishedNews } from "../lib/news";
import "./news-public.css";

export const metadata = {
  title: "News · Hellenstein Rascals",
  description: "Aktuelle News, Spielberichte und Vereinsmeldungen der Hellenstein Rascals.",
};

export default async function NewsPage() {
  const posts = await listPublishedNews();

  return (
    <main className="public-news-page">
      <header className="public-news-hero">
        <a href="/" className="public-news-back">← Zur Startseite</a>
        <span>INSIDE RASCALS</span>
        <h1>FROM THE <i>HUDDLE.</i></h1>
        <p>Spielberichte, Team-News, Vereinsleben und aktuelle Meldungen.</p>
      </header>

      <section className="public-news-grid">
        {posts.map((post) => (
          <article key={post.id} className="public-news-card">
            <a href={`/news/${post.slug}`}>
              <div className="public-news-image">
                {post.image ? <img src={post.image} alt="" /> : <div className="public-news-placeholder">RASCALS</div>}
              </div>
              <div className="public-news-copy">
                <span>{post.category} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("de-DE") : ""}</span>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <b>Story lesen →</b>
              </div>
            </a>
          </article>
        ))}
        {!posts.length && (
          <div className="public-news-empty">
            <b>Noch keine veröffentlichten News.</b>
            <p>Veröffentlichte Beiträge erscheinen hier automatisch.</p>
          </div>
        )}
      </section>
    </main>
  );
}
