"use client";

import { useEffect, useMemo, useState } from "react";
import "../admin.css";
import "../phase2.css";
import "./news.css";

type NewsPost = {
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

type MediaItem = {
  key: string;
  url: string;
};

const emptyPost: NewsPost = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  image: "",
  category: "Team",
  status: "draft",
  publishedAt: null,
  createdAt: "",
  updatedAt: "",
};

export function NewsManager() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<NewsPost>(emptyPost);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [newsResponse, mediaResponse] = await Promise.all([
        fetch("/api/news"),
        fetch("/api/media"),
      ]);
      if (!newsResponse.ok || !mediaResponse.ok) throw new Error("Daten konnten nicht geladen werden.");
      const news = await newsResponse.json() as { items: NewsPost[] };
      const files = await mediaResponse.json() as { items: MediaItem[] };
      setPosts(news.items);
      setMedia(files.items);
      setSelected(news.items[0] ?? emptyPost);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  async function save(status: "draft" | "published") {
    if (!selected.title.trim()) {
      setNotice("Bitte einen Titel eingeben.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...selected, status };
      const response = await fetch("/api/news", {
        method: selected.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Speichern fehlgeschlagen.");
      }
      const body = await response.json() as { item: NewsPost };
      setPosts((current) => selected.id
        ? current.map((post) => post.id === body.item.id ? body.item : post)
        : [body.item, ...current]);
      setSelected(body.item);
      setNotice(status === "published" ? "News wurde veröffentlicht." : "Entwurf wurde gespeichert.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(post: NewsPost) {
    if (!confirm(`„${post.title}“ wirklich löschen?`)) return;
    const response = await fetch(`/api/news?id=${encodeURIComponent(post.id)}`, { method: "DELETE" });
    if (!response.ok) {
      setNotice("Löschen fehlgeschlagen.");
      return;
    }
    setPosts((current) => current.filter((item) => item.id !== post.id));
    setSelected(emptyPost);
    setNotice("News wurde gelöscht.");
  }

  const filtered = useMemo(() => posts.filter((post) =>
    `${post.title} ${post.category} ${post.status}`.toLowerCase().includes(query.toLowerCase()),
  ), [posts, query]);

  if (loading) return <div className="admin-loading"><img src="/rascals-logo-transparent-4k.png" alt="" /><b>NEWS WERDEN GELADEN</b></div>;

  return (
    <div className="news-admin-shell">
      <aside className="news-sidebar">
        <div className="news-brand"><img src="/rascals-logo-transparent-4k.png" alt="" /><div><b>RASCALS CMS</b><small>NEWS CONTROL</small></div></div>
        <a href="/admin">← Dashboard</a>
        <button className="new-post-button" onClick={() => setSelected(emptyPost)}>＋ Neue News</button>
        <input className="news-search" placeholder="News durchsuchen…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="news-list">
          {filtered.map((post) => (
            <button key={post.id} className={selected.id === post.id ? "active" : ""} onClick={() => setSelected(post)}>
              <span>{post.status === "published" ? "LIVE" : "ENTWURF"}</span>
              <b>{post.title}</b>
              <small>{post.category} · {new Date(post.updatedAt).toLocaleDateString("de-DE")}</small>
            </button>
          ))}
          {!filtered.length && <p className="news-empty">Noch keine News vorhanden.</p>}
        </div>
      </aside>

      <main className="news-editor-area">
        <header className="news-topbar">
          <div><small>PHASE 3 · NEWS</small><h1>{selected.id ? "News bearbeiten" : "Neue News erstellen"}</h1></div>
          <div className="news-top-actions">
            {selected.id && <button className="ghost-button" onClick={() => void remove(selected)}>Löschen</button>}
            <button className="ghost-button" disabled={saving} onClick={() => void save("draft")}>Entwurf speichern</button>
            <button className="publish-button" disabled={saving} onClick={() => void save("published")}>{saving ? "Speichert…" : "Veröffentlichen"}</button>
          </div>
        </header>

        {notice && <div className="admin-notice"><span>{notice}</span><button onClick={() => setNotice("")}>×</button></div>}

        <section className="news-editor-grid">
          <div className="news-form-card">
            <label>Titel<input value={selected.title} onChange={(event) => setSelected({ ...selected, title: event.target.value })} placeholder="Zum Beispiel: Rascals gewinnen Heimspiel" /></label>
            <div className="news-two-cols">
              <label>Kategorie<select value={selected.category} onChange={(event) => setSelected({ ...selected, category: event.target.value })}><option>Team</option><option>Gameday</option><option>Verein</option><option>Shop</option><option>Sponsoring</option><option>Jugend</option></select></label>
              <label>URL-Slug<input value={selected.slug} onChange={(event) => setSelected({ ...selected, slug: event.target.value })} placeholder="wird automatisch erzeugt" /></label>
            </div>
            <label>Kurzbeschreibung<textarea rows={3} value={selected.excerpt} onChange={(event) => setSelected({ ...selected, excerpt: event.target.value })} placeholder="Kurze Vorschau für die News-Übersicht" /></label>
            <label>Artikeltext<textarea className="news-content-input" rows={16} value={selected.content} onChange={(event) => setSelected({ ...selected, content: event.target.value })} placeholder="Schreibe hier den vollständigen Artikel…" /></label>
          </div>

          <aside className="news-side-panel">
            <article>
              <small>TITELBILD</small>
              <div className="news-image-preview">{selected.image ? <img src={selected.image} alt="" /> : <span>Noch kein Bild ausgewählt</span>}</div>
              <select value={selected.image} onChange={(event) => setSelected({ ...selected, image: event.target.value })}>
                <option value="">Kein Bild</option>
                {media.map((item) => <option key={item.key} value={item.url}>{item.key.split("/").pop()}</option>)}
              </select>
            </article>
            <article>
              <small>STATUS</small>
              <div className={`news-status ${selected.status}`}><span />{selected.status === "published" ? "Veröffentlicht" : "Entwurf"}</div>
              {selected.publishedAt && <p>Veröffentlicht am {new Date(selected.publishedAt).toLocaleString("de-DE")}</p>}
            </article>
            <article>
              <small>LIVE-VORSCHAU</small>
              <div className="news-preview-card">
                {selected.image && <img src={selected.image} alt="" />}
                <div><span>{selected.category}</span><h3>{selected.title || "Dein News-Titel"}</h3><p>{selected.excerpt || "Hier erscheint die Kurzbeschreibung deiner News."}</p></div>
              </div>
            </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
