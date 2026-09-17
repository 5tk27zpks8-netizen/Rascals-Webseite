import type { CSSProperties } from "react";
import { ArenaDrive } from "./ArenaDrive";
import { RascalsPlayerCard } from "./team/RascalsPlayerCard";
import type { Player } from "./lib/football";
import "./home-arena.css";
import "./arena-roster.css";

/**
 * THE DRIVE — ROSTER ONLY.
 *
 * The Arena stadium with nothing in it but the squad: no fixture, no numbers,
 * no schedule, no news. A preview of what the drive looks like when the player
 * cards are the entire content.
 *
 * It reuses the drive wholesale — same stadium, same scroll engine, same
 * broadcast overlay — and only swaps what the stops carry. The roster is cut
 * into groups of six, each group gets its own stop, and the stops are spread
 * evenly over the drive, so walking from the own 20 to the end zone walks the
 * whole squad. ArenaDrive finds the stops by their data-from/data-to, so
 * nothing about the engine needs to know the count has changed; the track
 * height rides a variable instead of the seven-panel constant.
 */

const PER_STOP = 6;

function chunk(players: Player[], size: number) {
  const out: Player[][] = [];
  for (let i = 0; i < players.length; i += size) out.push(players.slice(i, i + size));
  return out;
}

/** Captains and starters first — with a thin roster those carry the real data. */
function order(players: Player[]) {
  return [...players].sort((a, b) => {
    const rank = (p: Player) => (p.captain ? 0 : 1) * 4 + (p.starter ? 0 : 1) * 2 + (p.portrait ? 0 : 1);
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    const an = a.jerseyNumber ?? 999;
    const bn = b.jerseyNumber ?? 999;
    if (an !== bn) return an - bn;
    return a.lastName.localeCompare(b.lastName, "de");
  });
}

/** Ball position for a stop, counted from our own 20 to the opposing end zone. */
function yardLabel(progress: number) {
  const absolute = 20 + progress * 80;
  if (absolute >= 99) return "TOUCHDOWN";
  return absolute > 50
    ? `OPP ${String(Math.round(100 - absolute)).padStart(2, "0")}`
    : `OWN ${String(Math.round(absolute)).padStart(2, "0")}`;
}

export function ArenaRoster({ players }: { players: Player[] }) {
  const groups = chunk(order(players), PER_STOP);
  /* One opening stop plus one per group. Each gets an equal stretch of the
     drive, which is also what the scroll height is built from. */
  const stops = groups.length + 1;
  const span = 1 / stops;

  const marks = Array.from({ length: stops }, (_, index) => ({
    id: index === 0 ? "kickoff" : `unit-${index}`,
    from: index * span,
    to: (index + 1) * span,
    yard: yardLabel(index * span),
  }));

  return (
    <div className="drive-page drive-roster-page" style={{ "--stops": stops } as CSSProperties}>
      <ArenaDrive />
      <div className="drive-vignette" aria-hidden="true" />

      <header className="drive-hud">
        <a className="drive-hud-brand" href="/">
          <img src="/rascals-logo-transparent-4k.png" alt="" />
          <span>HELLENSTEIN<br /><i>RASCALS</i></span>
        </a>
        <div className="drive-hud-centre">
          <span className="drive-hud-down" data-hud-down>KICKOFF</span>
          <div className="drive-hud-bar" data-hud-bar><i /><u /></div>
          <span className="drive-hud-caption" data-hud-caption>Der Drive läuft</span>
        </div>
        <div className="drive-hud-yard">
          <small>Ball on</small>
          <b data-hud-yard>OWN 20</b>
        </div>
      </header>

      <nav className="drive-chain" aria-label="Kader">
        {marks.map((mark, index) => (
          <a key={mark.id} href={`#${mark.id}`} data-chain={mark.id}>
            <span>{mark.yard}</span>
            <small>{index === 0 ? "KICKOFF" : `${index}/${groups.length}`}</small>
          </a>
        ))}
      </nav>

      <main className="drive-track">
        <section
          id="kickoff"
          className="drive-panel drive-panel-open"
          data-from={marks[0].from}
          data-to={marks[0].to}
        >
          <p className="drive-eyebrow" data-cue>Kader 2026 · Own 20</p>
          <h1 data-cue>
            <span>DAS SIND</span>
            <i>DIE RASCALS.</i>
          </h1>
          <p className="drive-lead" data-cue>
            {players.length} Spieler, ein Drive. Scroll dich über das Feld — Karte für Karte,
            von der eigenen 20 bis in die Endzone.
          </p>
          <span className="drive-hint" data-cue>Scrollen startet den Drive</span>
        </section>

        {groups.map((group, index) => {
          const mark = marks[index + 1];
          return (
            <section
              key={mark.id}
              id={mark.id}
              className="drive-panel is-wide arena-roster-panel"
              data-from={mark.from}
              data-to={mark.to}
            >
              <div className="arena-roster-head">
                <p className="drive-eyebrow" data-cue>{mark.yard}</p>
                <span className="arena-roster-count" data-cue>
                  {index * PER_STOP + 1}–{index * PER_STOP + group.length}
                  <i>/{players.length}</i>
                </span>
              </div>
              {/* No wrapper link: RascalsPlayerCard is an <a> itself, and
                  nesting anchors is invalid — the browser unnests them and the
                  outer element collapses to nothing. */}
              <div className="arena-roster-cards">
                {group.map((player) => (
                  <div className="arena-roster-card" key={player.id} data-cue>
                    <RascalsPlayerCard player={player} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
