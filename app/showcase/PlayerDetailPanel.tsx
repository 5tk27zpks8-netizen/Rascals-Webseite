"use client";

import { useEffect, useRef, useState } from "react";
import type { Player, PlayerStat } from "../lib/football";

/**
 * THE DOSSIER.
 *
 * A player card opens this, and the drive holds still behind it.
 *
 * A side panel rather than a centred modal, for two reasons. The presentation
 * is the point of the page, and a box in the middle of the screen covers the
 * one thing the viewer came for; anchored to the right edge, the stadium and
 * the card that opened it stay visible behind. And it is the shape the content
 * actually is — a column of labelled rows — so it needs height rather than
 * width, which is what the side of a screen has.
 *
 * ---------------------------------------------------------------------
 * WHAT HAPPENS TO THE PAGE UNDERNEATH
 *
 * The page is pinned while this is open, because a panel that scrolls the
 * drive behind it is a panel that loses its own place. Pinning means fixing
 * the body, which zeroes `window.scrollY` — and the drive reads that every
 * frame, so on its own it would set off for the start of the field the moment
 * a card was clicked. `holdDrive` stops it taking new readings for as long as
 * the panel is up; `releaseDrive` hands the position back explicitly on close.
 */

/** Stats come from the database keyed however the CMS records them. */
const STAT_LABELS: Record<string, string> = {
  touchdowns: "Touchdowns",
  tackles: "Tackles",
  sacks: "Sacks",
  interceptions: "Interceptions",
  receptions: "Receptions",
  receiving_yards: "Receiving Yards",
  rushing_yards: "Rushing Yards",
  passing_yards: "Passing Yards",
  completions: "Completions",
  attempts: "Attempts",
  fumbles: "Fumbles",
  games: "Spiele",
};

const prettyStat = (key: string) =>
  STAT_LABELS[key] ??
  key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Whole years, counted properly rather than by dividing milliseconds. */
function ageFrom(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

type Detail = { stats: PlayerStat[]; achievements: { type: string; note?: string }[] };

export function PlayerDetailPanel({
  player,
  coach,
  onClose,
}: {
  player: Player | null;
  coach: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const panel = useRef<HTMLDivElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  /* Where focus came from, so it can go back there. Without this, closing the
     panel drops a keyboard user at the top of the document and they have to
     tab back through the whole squad to reach the card they just looked at. */
  const opener = useRef<HTMLElement | null>(null);

  const open = player !== null;

  // Remember the opener before the panel takes focus.
  useEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);

  // Escape closes, and focus is kept inside while it is up.
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      /* A dialog that lets Tab wander out onto the cards behind it is a dialog
         a keyboard user cannot tell the edges of. */
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener.current?.focus?.();
    };
  }, [open, onClose]);

  // The numbers, asked for once per player and only once it is wanted.
  useEffect(() => {
    if (!player) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    fetch(`/api/public/player-detail?id=${encodeURIComponent(player.id)}`)
      .then((response) => (response.ok ? response.json() : { stats: [], achievements: [] }))
      .then((data: Detail) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) setDetail({ stats: [], achievements: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [player]);

  if (!player) return null;

  const fullName = `${player.firstName} ${player.lastName}`.trim();
  const age = ageFrom(player.birthDate);
  const facts: { label: string; value: string }[] = [];
  if (!coach && player.jerseyNumber !== null) {
    facts.push({ label: "Nummer", value: `#${player.jerseyNumber}` });
  }
  /* Only what is actually recorded. A club database is not a sports almanac:
     most of these players have a name, a number and nothing else yet, and a
     panel that answers every question with an em dash looks broken rather than
     sparse. Empty fields are left out and the grid closes up around them. */
  if (player.position) {
    facts.push({ label: coach ? "Rolle" : "Position", value: player.position });
  }
  if (player.secondaryPosition) {
    facts.push({ label: "Auch", value: player.secondaryPosition });
  }
  if (player.heightCm) facts.push({ label: "Größe", value: `${(player.heightCm / 100).toFixed(2)} m` });
  if (player.weightKg) facts.push({ label: "Gewicht", value: `${player.weightKg} kg` });
  if (age !== null) facts.push({ label: "Alter", value: `${age}` });
  if (player.joinedYear) facts.push({ label: "Im Team seit", value: `${player.joinedYear}` });

  const stats = detail?.stats ?? [];

  return (
    <div className="sc-overlay" role="presentation">
      {/* Clicking away closes. Not a focusable control — the close button and
          Escape are the real ways out; this is the convenience. */}
      <div className="sc-scrim" onClick={onClose} aria-hidden="true" />

      <div
        className="sc-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-panel-name"
        ref={panel}
      >
        <div className="sc-panel-head">
          <div className="sc-panel-eyebrow">
            <span className="sc-panel-mark" aria-hidden="true" />
            {coach ? "COACHING STAFF" : "ROSTER"}
            {player.captain ? <b>· CAPTAIN</b> : null}
            {player.rookie ? <b>· ROOKIE</b> : null}
          </div>
          <h2 className="sc-panel-name" id="sc-panel-name">
            <i>{player.firstName}</i>
            <em>{player.lastName}</em>
          </h2>
          {player.nickname ? <p className="sc-panel-nick">„{player.nickname}“</p> : null}

          <button
            type="button"
            className="sc-close"
            onClick={onClose}
            ref={closeButton}
            aria-label="Schließen"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="sc-panel-scroll">
          <div className={`sc-panel-portrait${player.portrait ? "" : " is-empty"}`}>
            {player.portrait ? (
              <img src={player.portrait} alt={fullName} loading="lazy" decoding="async" />
            ) : (
              /* No photograph on file. The initials carry the space instead of
                 an empty frame — the panel still opens on something deliberate
                 rather than on a gap where a picture failed. */
              <span className="sc-panel-initials" aria-hidden="true">
                {(player.firstName[0] ?? "") + (player.lastName[0] ?? "")}
              </span>
            )}
            {!coach && player.jerseyNumber !== null ? (
              <span className="sc-panel-number" aria-hidden="true">
                {player.jerseyNumber}
              </span>
            ) : null}
          </div>

          {facts.length > 0 ? (
            <dl className="sc-facts">
              {facts.map((fact, index) => (
                <div
                  /* An odd one out takes the full width rather than leaving a
                     hole beside it, which reads as a missing tile. */
                  className={
                    index === facts.length - 1 && facts.length % 2 === 1
                      ? "sc-fact is-wide"
                      : "sc-fact"
                  }
                  key={fact.label}
                >
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {!coach ? (
            <section className="sc-block">
              <h3>Saison 2026</h3>
              {loading ? (
                <p className="sc-muted">Lade Werte …</p>
              ) : stats.length > 0 ? (
                <ul className="sc-stats">
                  {stats.map((stat) => (
                    <li key={stat.key}>
                      <b>{stat.value}</b>
                      <span>{prettyStat(stat.key)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sc-muted">Für diese Saison sind noch keine Werte erfasst.</p>
              )}
            </section>
          ) : null}

          {player.bio ? (
            <section className="sc-block">
              <h3>Zur Person</h3>
              <p className="sc-bio">{player.bio}</p>
            </section>
          ) : null}

          <div className="sc-panel-links">
            {player.instagram ? (
              <a
                className="sc-link"
                href={
                  player.instagram.startsWith("http")
                    ? player.instagram
                    : `https://instagram.com/${player.instagram.replace(/^@/, "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
            ) : null}
            {player.slug ? (
              <a className="sc-link is-ghost" href={`/team/${player.slug}`}>
                Volles Profil
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
