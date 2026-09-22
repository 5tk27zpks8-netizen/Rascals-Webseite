"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./home-news-contrast.css";
import "./home-game-logos.css";

type NewsItem = { id:string; slug:string; title:string; excerpt:string; image:string; category:string; publishedAt:string|null };
type SponsorItem = { id:string; name:string; logo:string; url:string };

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
        : <>{[0,1].map(sequence=><div className="ticker-sequence" key={sequence} aria-hidden={sequence===1}>{(sponsors.length?[...sponsors,...sponsors,...sponsors]:[]).map((sponsor,index)=><a key={`${sequence}-${sponsor.id}-${index}`} className="sponsor-logo" href={sponsor.url||"/sponsoring"} target={sponsor.url?"_blank":undefined} rel={sponsor.url?"noreferrer":undefined}>{sponsor.logo?<img src={sponsor.logo} alt={sequence===0?sponsor.name:""}/>:<strong>{sponsor.name}</strong>}</a>)}</div>)}</>,
      sponsorTarget)}
  </>;
}
