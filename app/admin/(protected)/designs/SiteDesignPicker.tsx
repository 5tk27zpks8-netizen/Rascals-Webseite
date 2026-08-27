"use client";

import { useEffect, useState } from "react";
import type { SiteDesign, SiteDesignId } from "../../../lib/site-design";
import "./site-design-picker.css";

/**
 * Picks which complete design the public site is built from.
 *
 * Kept separate from the preset library below it: presets recolour the CMS
 * builder, this swaps the whole page. Conflating the two is what made four
 * designs look like one, so the wording here says plainly what changes.
 */
export function SiteDesignPicker() {
  const [designs, setDesigns] = useState<SiteDesign[]>([]);
  const [active, setActive] = useState<SiteDesignId | null>(null);
  const [saving, setSaving] = useState<SiteDesignId | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/admin/api/site-design")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Designs konnten nicht geladen werden."))))
      .then((body: { active: SiteDesignId; designs: SiteDesign[] }) => {
        if (!live) return;
        setDesigns(body.designs ?? []);
        setActive(body.active ?? null);
      })
      .catch((cause) => { if (live) setError(cause instanceof Error ? cause.message : "Laden fehlgeschlagen."); });
    return () => { live = false; };
  }, []);

  async function apply(id: SiteDesignId) {
    setSaving(id);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/admin/api/site-design", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ design: id }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; active?: SiteDesignId };
      if (!response.ok) throw new Error(body.error || "Design konnte nicht gesetzt werden.");
      setActive(body.active ?? id);
      setNotice("Design ist live. Die Startseite zeigt es sofort.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="sdp">
      <header className="sdp-head">
        <div>
          <small>GESTALTUNG</small>
          <h2>Website-Design</h2>
        </div>
        <p>
          Vier vollständige Designs. Sie unterscheiden sich im Aufbau, in der Typografie und in der Bewegung —
          nicht nur in den Farben. Jedes lässt sich vorher ansehen.
        </p>
      </header>

      {error && <div className="sdp-error">{error}</div>}
      {notice && <div className="sdp-notice">{notice}</div>}

      <div className="sdp-grid">
        {designs.map((design) => {
          const isActive = design.id === active;
          return (
            <article key={design.id} className={isActive ? "sdp-card active" : "sdp-card"}>
              <div className="sdp-swatches" aria-hidden="true">
                {design.palette.map((color, index) => <span key={`${color}-${index}`} style={{ background: color }} />)}
              </div>

              <div className="sdp-card-head">
                <div>
                  <small>{design.tagline}</small>
                  <h3>{design.name}</h3>
                </div>
                {isActive && <span className="sdp-badge">LIVE</span>}
              </div>

              <p>{design.description}</p>

              <ul className="sdp-traits">
                {design.traits.map((trait) => <li key={trait}>{trait}</li>)}
              </ul>

              {design.webgl && (
                <p className="sdp-warn">
                  Nutzt eine 3D-Szene. Am Rechner voll animiert, auf dem Handy und bei reduzierter
                  Bewegung ein ruhiges Standbild.
                </p>
              )}

              <div className="sdp-actions">
                <a className="sdp-preview" href={design.preview} target="_blank" rel="noreferrer">Ansehen ↗</a>
                <button
                  className="sdp-apply"
                  onClick={() => void apply(design.id)}
                  disabled={isActive || saving !== null}
                >
                  {isActive ? "Aktiv" : saving === design.id ? "Wird gesetzt…" : "Live schalten"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
