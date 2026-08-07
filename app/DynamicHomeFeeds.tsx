"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  publishedAt: string | null;
};

type SponsorItem = {
  id: string;
  name: string;
  logo: string;
  url: string;
};

export function DynamicHomeFeeds() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/public/news").then((r) => r.ok ? r.json() : { items: [] }),
      fetch("/api/public/sponsors").then((r) => r.ok ? r.json() : { items: [] }),
    ]).then(([newsData, sponsorData]) => {
      setNews(newsData.items ?? []);
      setSponsors(sponsorData.items ?? []);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.dynamicHomeFeeds = "1";
    style.textContent = `.news-preview,.sponsor-strip{display:none!important}.dynamic-home-news,.dynamic-home-sponsors{display:block}`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <>
      <section className="section news-preview dynamic-home-news">
        <div className="section-heading">
          <div><span className="eyebrow red-text">Inside Rascals</span><h2>FROM THE <i>HUDDLE.</i></h2></div>
          <a className="text-link dark-link" href="/news">Alle News <span>→</span></a>
        </div>
        <div className="news-grid">
          {news.map((item, index) => (
            <article key={item.id} className={index === 0 ? "featured-news" : "compact-news"}>
              {item.image && <img src={item.image} alt="" />}
              <div>
                <span>{item.category} · {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("de-DE") : ""}</span>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <a href={`/news/${item.slug}`}>Story lesen →</a>
              </div>
            </article>
          ))}
          {!news.length && <article className="featured-news"><div><span>NEWS</span><h3>Noch keine veröffentlichten Beiträge</h3><p>Neue Beiträge erscheinen hier automatisch, sobald sie im CMS veröffentlicht werden.</p><a href="/news">Zur News-Seite →</a></div></article>}
        </div>
      </section>

      <section className="sponsor-strip dynamic-home-sponsors" aria-label="Unsere Partner">
        <p>PROUDLY POWERED BY</p>
        <div className="ticker-window">
          <div className="ticker-track">
            {[0, 1].map((sequence) => (
              <div className="ticker-sequence" key={sequence} aria-hidden={sequence === 1}>
                {(sponsors.length ? [...sponsors, ...sponsors, ...sponsors] : []).map((sponsor, index) => (
                  <a key={`${sequence}-${sponsor.id}-${index}`} className="sponsor-logo" href={sponsor.url || "/sponsoring"} target={sponsor.url ? "_blank" : undefined} rel={sponsor.url ? "noreferrer" : undefined}>
                    {sponsor.logo ? <img src={sponsor.logo} alt={sequence === 0 ? sponsor.name : ""} /> : <strong>{sponsor.name}</strong>}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
