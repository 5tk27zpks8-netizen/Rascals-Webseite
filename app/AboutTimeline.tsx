"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./about-timeline.css";

const milestones = [
  { year: "2023", tag: "KICKOFF", league: "AUFBAULIGA", note: "Gründung · Der erste Snap", mark: "01" },
  { year: "2025", tag: "NEXT DOWN", league: "KREISLIGA", note: "Der nächste Schritt", mark: "02" },
  { year: "2026", tag: "MOVING THE CHAINS", league: "KREISOBERLIGA", note: "Aufstieg · Weiter nach vorne", mark: "03" },
  { year: "2027", tag: "NEXT LEVEL", league: "BEZIRKSLIGA", note: "Das nächste Kapitel", mark: "TD" },
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
          <span className="history-kicker"><i /> OUR DRIVE</span>
          <h2 id="rascals-history-title">FROM FIRST SNAP<br />TO <em>NEXT LEVEL.</em></h2>
        </div>
        <p>Vier Stationen. Ein Drive. Seit dem ersten Snap arbeiten sich die Rascals Yard für Yard nach vorne.</p>
      </div>

      <div className="football-field-line" aria-hidden="true">
        <span>10</span><span>20</span><span>30</span><span>40</span><span>50</span>
      </div>

      <div className="history-drive">
        {milestones.map((item, index) => (
          <article className={`history-stop ${index === milestones.length - 1 ? "next" : ""}`} key={item.year}>
            <div className="history-marker"><span>{item.mark}</span></div>
            <small>{item.tag}</small>
            <strong>{item.year}</strong>
            <h3>{item.league}</h3>
            <p>{item.note}</p>
          </article>
        ))}
      </div>
      <div className="history-endzone" aria-hidden="true">RASCALS <b>END ZONE</b></div>
    </section>,
    target,
  );
}
