"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { alternateMediaUrl, normalizeMediaUrl } from "./lib/media-url";
import "./home-news-contrast.css";
import "./home-game-logos.css";

type NewsItem = { id:string; slug:string; title:string; excerpt:string; image:string; category:string; publishedAt:string|null };
type SponsorItem = { id:string; name:string; logo:string; url:string };

/**
 * A partner's mark, or their name when the mark will not load.
 *
 * The band used to put whatever URL the CMS held straight into an `img`. A
 * logo uploaded with a space or an umlaut in its filename comes back out with
 * its key encoded differently than it went in, so the request 404s — and a
 * failed image inside a white tile is not a broken picture, it is nothing at
 * all. The band then reads as a row of blank white slabs, which is what a
 * visitor sees rather than the sponsors who paid to be there.
 *
 * So: the URL is normalised, the alternative encoding is tried if the first
 * one fails, and if neither loads the partner is still named. The same three
 * steps the fixture logos already take — there was no reason for the sponsors
 * to be treated differently.
 */
function SponsorMark({ logo, name }: { logo: string; name: string }) {
  const primary = normalizeMediaUrl(logo || "");
  const sources = useMemo(
    () => Array.from(new Set([primary, alternateMediaUrl(primary)].filter(Boolean))),
    [primary],
  );
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFailed(false);
  }, [primary]);

  const current = sources[index];
  if (!current || failed) return <strong>{name}</strong>;

  return (
    <img
      src={current}
      alt={name}
      /* Eager, because these scroll into view on their own: a lazy tile
         outside the window never loads and then pops in mid-slide. */
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (index + 1 < sources.length) setIndex((value) => value + 1);
        else setFailed(true);
      }}
    />
  );
}

export function DynamicHomeFeeds() {
  const [news,setNews]=useState<NewsItem[]>([]);
  const [sponsors,setSponsors]=useState<SponsorItem[]>([]);
  /* Empty and not-yet-fetched are different states and they have to look
     different. Without this the band flashes its "become a partner" tile on
     every load before the real logos arrive. */
  const [sponsorsLoaded,setSponsorsLoaded]=useState(false);
  const [newsTarget,setNewsTarget]=useState<Element|null>(null);
  const [sponsorTarget,setSponsorTarget]=useState<Element|null>(null);

  useEffect(()=>{
    const newsGrid=document.querySelector(".news-preview .news-grid");
    const sponsorTrack=document.querySelector(".sponsor-strip .ticker-track");
    if(newsGrid){newsGrid.innerHTML="";setNewsTarget(newsGrid)}
    if(sponsorTrack){sponsorTrack.innerHTML="";setSponsorTarget(sponsorTrack)}
    Promise.all([
      fetch("/api/public/news").then(r=>r.ok?r.json():{items:[]}),
      fetch("/api/public/sponsors").then(r=>r.ok?r.json():{items:[]}),
    ]).then(([newsData,sponsorData])=>{setNews(newsData.items??[]);setSponsors(sponsorData.items??[]);setSponsorsLoaded(true)}).catch(()=>setSponsorsLoaded(true));
  },[]);

  /* THE BAND HAS TO LOOK LIKE IT IS MOVING.

     The marquee ran for a fixed eighty seconds however long the row was, so
     its speed depended on how many partners the club happened to have — and
     on a phone, where the window is four hundred pixels rather than sixteen
     hundred, four sponsors crawled past at thirty-four pixels a second. That
     is slow enough that a glance at the band shows nothing moving at all,
     which is the complaint: it does not run.

     So the duration is worked out from the distance instead. One sequence is
     measured and divided by a speed, which keeps the band moving at the same
     pace on every screen and with any number of partners. Measured rather than
     counted, because a partner whose logo will not load is shown by name and
     a long name makes a wider tile. */
  useEffect(()=>{
    if(!sponsorTarget)return;
    const track=sponsorTarget as HTMLElement;
    const sequence=track.querySelector<HTMLElement>(".ticker-sequence");
    if(!sequence)return;
    const PIXELS_PER_SECOND=70;
    const apply=()=>{
      const width=sequence.getBoundingClientRect().width;
      if(width>0)track.style.animationDuration=`${Math.max(12,width/PIXELS_PER_SECOND).toFixed(1)}s`;
    };
    apply();
    const observer=new ResizeObserver(apply);
    observer.observe(sequence);
    return ()=>observer.disconnect();
  },[sponsorTarget,sponsors]);

  return <>
    {newsTarget&&createPortal(<>{news.map((item,index)=><article key={item.id} className={index===0?"featured-news":"compact-news"}>{item.image&&<img src={item.image} alt=""/>}<div><span>{item.category} · {item.publishedAt?new Date(item.publishedAt).toLocaleDateString("de-DE"):""}</span><h3>{item.title}</h3><p>{item.excerpt}</p><a href={`/news/${item.slug}`}>Story lesen →</a></div></article>)}{!news.length&&<article className="featured-news"><div><span>NEWS</span><h3>Noch keine veröffentlichten Beiträge</h3><p>Neue Beiträge erscheinen hier automatisch, sobald sie im CMS veröffentlicht werden.</p><a href="/news">Zur News-Seite →</a></div></article>}</>,newsTarget)}
    {sponsorTarget&&createPortal(
      /* NOTHING TO SCROLL IS NOT THE SAME AS NOTHING TO SAY.

         With no partners in the CMS this band rendered as its red label and
         then bare white for the rest of the row — which reads as a feature
         that broke rather than a list that is empty. One tile inviting a
         partner keeps the section meaningful until there are logos, and the
         marquee stops, because a single tile sliding past on an eighty-second
         loop looks like a fault of its own. */
      sponsorsLoaded&&!sponsors.length
        ? <div className="ticker-sequence"><a className="sponsor-logo sponsor-logo-empty" href="/sponsoring"><strong>PARTNER WERDEN</strong><span>Unterstütze die Rascals →</span></a></div>
        : <>{[0,1].map(sequence=><div className="ticker-sequence" key={sequence} aria-hidden={sequence===1}>{(sponsors.length?[...sponsors,...sponsors,...sponsors]:[]).map((sponsor,index)=><a key={`${sequence}-${sponsor.id}-${index}`} className="sponsor-logo" href={sponsor.url||"/sponsoring"} target={sponsor.url?"_blank":undefined} rel={sponsor.url?"noreferrer":undefined}><SponsorMark logo={sponsor.logo} name={sponsor.name}/></a>)}</div>)}</>,
      sponsorTarget)}
  </>;
}
