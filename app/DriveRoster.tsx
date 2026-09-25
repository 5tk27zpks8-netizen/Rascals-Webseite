import type { Player } from "./lib/football";
import { RascalsPlayerCard } from "./team/RascalsPlayerCard";
import "./drive-roster.css";

/**
 * The roster as a band of player cards inside the drive's team stop.
 *
 * The drive owns the scroll, so the band cannot have a scroller of its own.
 * Instead it rides `--panel-progress`, which ArenaDrive sets to how far through
 * this stop the drive is: scrolling the team section pulls the cards across,
 * the way a broadcast pushes through a squad graphic. Where the drive does not
 * run — phones, coarse pointers, reduced motion — the variable is never set and
 * the band falls back to an ordinary swipeable row.
 *
 * Captains and starters lead, because with a thin roster those are the entries
 * that actually carry a number, a position and a face.
 */

function rank(player: Player) {
  return (
    (player.captain ? 0 : 1) * 4 +
    (player.starter ? 0 : 1) * 2 +
    (player.portrait ? 0 : 1)
  );
}

export function DriveRoster({ players }: { players: Player[] }) {
  if (!players.length) return null;

  const ordered = [...players].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    const an = a.jerseyNumber ?? 999;
    const bn = b.jerseyNumber ?? 999;
    if (an !== bn) return an - bn;
    return a.lastName.localeCompare(b.lastName, "de");
  });

  return (
    <div className="drive-roster" data-cue>
      <div className="drive-roster-meta">
        <span>
          <b>{players.length}</b> im Kader
        </span>
        <span className="drive-roster-hint">Weiterscrollen zieht den Kader durch</span>
      </div>

      <div className="drive-roster-viewport">
        <div className="drive-roster-band" style={{ "--count": ordered.length } as React.CSSProperties}>
          {ordered.map((player) => (
            <article className="drive-roster-card" key={player.id}>
              <RascalsPlayerCard player={player} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
