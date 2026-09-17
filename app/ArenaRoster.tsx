import { ArenaDrive } from "./ArenaDrive";
import { PlayerDeck } from "./PlayerDeck";
import type { Player, PlayerUnit } from "./lib/football";
import "./home-arena.css";
import "./arena-roster.css";

/**
 * THE FORMATION, AND YOU FLY THROUGH IT.
 *
 * The Arena ground with nothing on it but the squad. No headline, no panels,
 * no copy, no footer, no boxes — the players stand out on the field like a
 * formation and scrolling carries you through them, one arriving at the front
 * as the last one passes behind you.
 *
 * The only chrome is the drive's own broadcast overlay and a bare unit switch,
 * which is radio inputs and labels: no client component and no hydration on a
 * page whose scroll is already spoken for.
 */

const UNITS: { id: PlayerUnit; label: string }[] = [
  { id: "offense", label: "OFFENSE" },
  { id: "defense", label: "DEFENSE" },
  { id: "special-teams", label: "SPECIAL" },
];

/** Captains, then starters, then by shirt number. */
function order(players: Player[]) {
  return [...players].sort((a, b) => {
    const rank = (p: Player) => (p.captain ? 0 : 1) * 2 + (p.starter ? 0 : 1);
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    const an = a.jerseyNumber ?? 999;
    const bn = b.jerseyNumber ?? 999;
    if (an !== bn) return an - bn;
    return a.lastName.localeCompare(b.lastName, "de");
  });
}

export function ArenaRoster({ players }: { players: Player[] }) {
  const byUnit = UNITS.map((unit) => ({
    ...unit,
    players: order(players.filter((player) => player.unit === unit.id)),
  }));

  // Open on the unit that actually has players, so it never starts empty.
  const initial = byUnit.reduce(
    (best, unit) => (unit.players.length > best.players.length ? unit : best),
    byUnit[0],
  );

  return (
    <div className="drive-page roster-page">
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

      {/* The radios sit before the panels so the :checked sibling selectors reach them. */}
      <div className="roster-units">
        {byUnit.map((unit) => (
          <input
            key={unit.id}
            type="radio"
            name="roster-unit"
            id={`unit-${unit.id}`}
            className="roster-radio"
            defaultChecked={unit.id === initial.id}
          />
        ))}

        {/* A radio group, not a tablist: role="tablist" without role="tab"
            children is broken ARIA, and the inputs already say "pick one". */}
        <div className="roster-switch" role="group" aria-label="Unit wählen">
          {byUnit.map((unit) => (
            <label key={unit.id} htmlFor={`unit-${unit.id}`} className="roster-tab">
              {unit.label}
              <small>{unit.players.length}</small>
            </label>
          ))}
        </div>

        {byUnit.map((unit) => (
          <section key={unit.id} className="roster-panel" data-unit={unit.id}>
            {unit.players.length === 0 ? (
              <p className="roster-empty">
                Für diese Unit ist noch kein Spieler hinterlegt.
              </p>
            ) : (
              <PlayerDeck players={unit.players} />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
