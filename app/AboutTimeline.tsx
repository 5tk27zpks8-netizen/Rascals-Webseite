"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./about-timeline.css";

const milestones = [
  { year: "2023", tag: "KICKOFF", league: "AUFBAULIGA", note: "Gründung der Hellenstein Rascals. Der erste Snap und der Start unserer Reise.", mark: "01", points: "" },
  { year: "2025", tag: "NEXT DOWN", league: "KREISLIGA", note: "Erste Erfolge, harte Battles und der nächste Schritt als Team.", mark: "02", points: "139 : 137" },
  { year: "2026", tag: "MOVING THE CHAINS", league: "KREISOBERLIGA", note: "Mehr Erfahrung, mehr Wille, mehr Team. Der Aufstieg bringt uns weiter nach vorne.", mark: "03", points: "170 : 66" },
  { year: "2027", tag: "NEXT LEVEL", league: "BEZIRKSLIGA", note: "Unser nächstes Ziel: Bezirksliga. Wir arbeiten. Wir glauben. Wir werden bereit sein.", mark: "TD", points: "" },
];

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
      <div className="rascals-history-head">
        <div>
          <span className="history-kicker"><i /> UNSERE REISE</span>
          <h2 id="rascals-history-title">FROM FIRST SNAP<br />TO <em>NEXT LEVEL.</em></h2>
        </div>
        <p>Vom ersten Snap bis zum nächsten Level. Jede Saison ist ein neuer Down – und jeder Down bringt uns Yard für Yard nach vorne.</p>
      </div>

      <div className="football-field-line" aria-hidden="true">
        <span>10</span><span>20</span><span>30</span><span>40</span><span>50</span>
      </div>

      <div className="history-drive">
        {milestones.map((item, index) => (
          <article className={`history-stop ${index === milestones.length - 1 ? "next" : ""}`} key={item.year}>
            <div className="history-marker" aria-hidden="true"><span>◆</span></div>
            <strong>{item.year}</strong>
            <small>{item.tag}</small>
            <h3>{item.league}</h3>
            {item.points && <div className="history-points"><span>POINTS</span><b>{item.points}</b></div>}
            <p>{item.note}</p>
            <div className="history-football-mark" aria-hidden="true">{item.mark}</div>
          </article>
        ))}
      </div>
      <div className="history-endzone" aria-hidden="true">RASCALS DRIVE <b>→ NEXT LEVEL</b></div>
    </section>,
    target,
  );
}
