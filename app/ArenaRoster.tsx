import { ArenaDrive } from "./ArenaDrive";
import { RascalsPlayerCard } from "./team/RascalsPlayerCard";
import type { Player, PlayerUnit } from "./lib/football";
import "./home-arena.css";
import "./arena-roster.css";

/**
 * THE SQUAD, IN THE STADIUM.
 *
 * The Arena ground with nothing in it but player cards: no fixture, no numbers,
 * no schedule, no news. The camera still walks down the field as you scroll —
 * that is ArenaDrive, unchanged — but the content is an ordinary column that
 * scrolls with it rather than the pinned one-screen stops the homepage uses.
 * Cards arrive line by line as they cross the scroll trigger, which is what a
 * pinned one-screen stop cannot do.
 *
 * The unit switch is plain radio inputs and labels. No client component, no
 * JavaScript, no hydration: it works on a page whose scroll is already spoken
 * for, and it keeps working if the drive never engages.
 */

const UNITS: { id: PlayerUnit; label: string; note: string }[] = [
  { id: "offense", label: "OFFENSE", note: "Die Unit, die Raum gewinnt und Punkte bringt." },
  { id: "defense", label: "DEFENSE", note: "Die Unit, die Drives stoppt und Momentum dreht." },
  { id: "special-teams", label: "SPECIAL TEAMS", note: "Kick, Punt, Return — ein Snap entscheidet." },
];

/** Captains, then starters, then by shirt number — the roster's own order. */
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

  // Open on the unit that actually has players, so the page never starts empty.
  const initial = byUnit.reduce((best, unit) => (unit.players.length > best.players.length ? unit : best), byUnit[0]);

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

      <main className="roster-flow">
        <section className="roster-open">
          <p className="drive-eyebrow" data-reveal>Kader 2026</p>
          <h1 data-reveal>
            DAS SIND
            <br />
            <i>DIE RASCALS.</i>
          </h1>
          <p className="roster-lead" data-reveal>
            {players.length} Spieler. Wähl die Unit und scroll dich Reihe für Reihe durch
            den Kader — während die Kamera über das Feld zieht.
          </p>
        </section>

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
                <b>{unit.label}</b>
                <small>{unit.players.length}</small>
              </label>
            ))}
          </div>

          {byUnit.map((unit) => (
            <section key={unit.id} className="roster-panel" data-unit={unit.id}>
              <p className="roster-note">{unit.note}</p>

              {unit.players.length === 0 ? (
                <p className="roster-empty">
                  Für diese Unit ist noch kein Spieler hinterlegt. Sobald im CMS eine Unit
                  gesetzt ist, erscheinen die Karten hier automatisch.
                </p>
              ) : (
                /* One grid rather than rows fixed at three: the column count
                   changes with the screen, and hard-coded rows of three would
                   break into a ragged 2+1 on a narrower one. The row-by-row
                   arrival comes from the reveals instead — cards on the same
                   line cross the trigger together, the next line follows. */
                <div className="roster-grid">
                  {unit.players.map((player, index) => (
                    <div
                      className="roster-card"
                      key={player.id}
                      data-reveal
                      data-reveal-delay={(index % 3) * 90}
                    >
                      <RascalsPlayerCard player={player} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="roster-end">
          <a href="/team">Zur klassischen Teamübersicht →</a>
        </footer>
      </main>
    </div>
  );
}
