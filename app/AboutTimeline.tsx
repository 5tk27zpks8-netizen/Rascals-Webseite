"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./about-timeline.css";

const milestones = [
  { year: "2023", tag: "KICKOFF", league: "AUFBAULIGA", note: "Gründung der Hellenstein Rascals. Der erste Schritt auf unserem Weg.", points: "", icon: "whistle" },
  { year: "2025", tag: "NEXT DOWN", league: "KREISLIGA", note: "Viele Spiele, viele Lektionen und ein Team, das zusammen gewachsen ist.", points: "139 : 137", icon: "ball" },
  { year: "2026", tag: "MOVING THE CHAINS", league: "KREISOBERLIGA", note: "Mehr Erfahrung, mehr Wille, mehr Team. Der verdiente Aufstieg in die Kreisoberliga.", points: "170 : 66", icon: "pads" },
  { year: "2027", tag: "NEXT LEVEL", league: "BEZIRKSLIGA", note: "Unser nächstes Ziel: die Bezirksliga. Wir arbeiten. Wir glauben. Wir werden bereit sein.", points: "", icon: "trophy" },
];

function Football() {
  return <span className="timeline-football" aria-hidden="true"><i /><b /><em /></span>;
}

export function AboutTimeline() {
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    const manifesto = document.querySelector(".manifesto");
    if (!manifesto?.parentElement) return;
    const host = document.createElement("div");
    host.className = "rascals-history-host";
    manifesto.insertAdjacentElement("afterend", host);
    setTarget(host);
    return () => host.remove();
  }, []);

  if (!target) return null;

  return createPortal(
    <section className="rascals-history" aria-labelledby="rascals-history-title">
      <div className="rascals-history-title">
        <span>UNSERE REISE.</span>
        <h2 id="rascals-history-title">FROM FIRST SNAP TO NEXT LEVEL<span>.</span></h2>
      </div>

      <div className="history-drive">
        <div className="drive-arrow" aria-hidden="true" />
        {milestones.map((item, index) => (
          <article className={`history-stop ${index === milestones.length - 1 ? "next" : ""}`} key={item.year}>
            <strong>{item.year}</strong>
            <div className="history-ball"><Football /></div>
            <small>{item.tag}</small>
            <h3>{item.league}</h3>
            {item.points && <div className="history-points"><span>POINTS</span><b>{item.points.replace(" : ", " ")}<i>:</i></b></div>}
            <div className={`history-symbol ${item.icon}`} aria-hidden="true"><i /><b /><em /></div>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
    </section>,
    target,
  );
}
