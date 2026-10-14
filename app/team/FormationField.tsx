import type { Player } from "../lib/football";
import { RascalsField } from "../RascalsField";
import { buildFormation, type FilledSlot } from "./formation";
import "./formation.css";

/**
 * The roster drawn as a formation on a field that pans sideways as you scroll.
 *
 * Uses the existing `data-pan` / `data-pan-track` pair from RascalsMotion: the
 * section pins and the track slides, so the whole formation is walked through
 * rather than shrunk to fit. Below 900px that handler stands down, and the
 * track becomes an ordinary swipeable strip instead.
 */

function initials(player: Player) {
  return `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`.toUpperCase() || "R";
}

function PlayerMarker({ slot }: { slot: FilledSlot }) {
  const { player } = slot;

  if (!player) {
    return (
      <div
        className="fm-slot fm-slot-open"
        style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
        title={`${slot.label} — noch nicht besetzt`}
      >
        <div className="fm-disc" aria-hidden="true">
          <span>{slot.pos}</span>
        </div>
        <div className="fm-tag fm-tag-open">
          <b>{slot.label}</b>
          <small>offen</small>
        </div>
      </div>
    );
  }

  const number = player.jerseyNumber == null ? null : String(player.jerseyNumber).padStart(2, "0");
  const name = `${player.firstName} ${player.lastName}`.trim();

  return (
    <a
      className="fm-slot fm-slot-filled"
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
      href={`/team/${player.slug}`}
    >
      {/* Depth behind the starter, drawn as stacked plates receding into the field. */}
      {slot.depth.length > 0 && (
        <span className="fm-depth" aria-hidden="true">
          {slot.depth.slice(0, 3).map((backup, index) => (
            <i key={backup.id} style={{ transform: `translate(${(index + 1) * 7}px, ${(index + 1) * 7}px)` }} />
          ))}
        </span>
      )}

      <div className="fm-disc">
        {player.portrait ? (
          <img src={player.portrait} alt="" />
        ) : (
          <span>{number ?? initials(player)}</span>
        )}
        {player.captain && <b className="fm-c" title="Captain">C</b>}
      </div>

      <div className="fm-tag">
        <b>{name}</b>
        <small>
          {slot.pos}
          {number && ` · #${number}`}
          {slot.depth.length > 0 && ` · +${slot.depth.length}`}
        </small>
      </div>
    </a>
  );
}

export function FormationField({ players }: { players: Player[] }) {
  const { groups, unassigned } = buildFormation(players);
  const onField = groups.reduce(
    (sum, group) => sum + group.slots.filter((slot) => slot.player).length + group.slots.reduce((d, s) => d + s.depth.length, 0),
    0,
  );

  return (
    <section className="fm" data-pan aria-label="Aufstellung auf dem Feld">
      <div className="fm-track" data-pan-track>
        {/* ---- Opening panel ---- */}
        <div className="fm-intro">
          <span className="fm-eyebrow">HELLENSTEIN RASCALS · 2026</span>
          <h2>
            DIE
            <br />
            <i>AUFSTELLUNG.</i>
          </h2>
          <p>
            Scroll dich quer über das Feld — vom Backfield durch die Line, über den Ball hinweg
            in die Front Seven und die Secondary.
          </p>
          <div className="fm-legend">
            <span><i className="fm-key-filled" />besetzt</span>
            <span><i className="fm-key-open" />offen</span>
          </div>
          <div className="fm-scroll-hint" aria-hidden="true">
            <span>SCROLLEN</span>
            <div className="fm-arrow" />
          </div>
        </div>

        {/* ---- The field ---- */}
        {/* Deliberately not .fixtures-section: that class makes every direct
            child position:relative, which would re-root the absolutely placed
            markers onto their zero-height group instead of the field. The field
            carries position/isolation itself, which is all RascalsField needs. */}
        <div className="fm-field">
          <RascalsField />

          {/* Line of scrimmage: the field runs sideways, so the ball sits on a
              vertical line and the two units face each other across it. */}
          <div className="fm-los" aria-hidden="true">
            <span>LINE OF SCRIMMAGE</span>
          </div>

          {groups.map((group) => (
            <div className="fm-group" key={group.id} data-group={group.id}>
              {group.slots.map((slot, index) => (
                <PlayerMarker key={`${group.id}-${slot.pos}-${index}`} slot={slot} />
              ))}
            </div>
          ))}

          {/* Zone names sit behind the players as ground markings. */}
          <div className="fm-zones" aria-hidden="true">
            <span style={{ left: "15%" }}>BACKFIELD</span>
            <span style={{ left: "36%" }}>LINE</span>
            <span style={{ left: "57%" }}>FRONT SEVEN</span>
            <span style={{ left: "77%" }}>SECONDARY</span>
            <span style={{ left: "92%" }}>SPECIAL</span>
          </div>
        </div>

        {/* ---- Sideline ---- */}
        {unassigned.length > 0 && (
          <div className="fm-bench">
            <div className="fm-bench-head">
              <small>AN DER SEITENLINIE</small>
              <h3>
                {unassigned.length} SPIELER
                <br />
                <i>OHNE POSITION.</i>
              </h3>
              <p>
                Sobald im CMS eine Position hinterlegt ist, rückt der Spieler automatisch auf
                seinen Platz in der Formation.
              </p>
            </div>
            <div className="fm-bench-grid">
              {unassigned.map((player) => (
                <a className="fm-bench-card" key={player.id} href={`/team/${player.slug}`}>
                  <span className="fm-bench-disc">
                    {player.portrait ? <img src={player.portrait} alt="" /> : initials(player)}
                  </span>
                  <b>
                    {player.firstName} {player.lastName}
                  </b>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ---- Closing tally ---- */}
        <div className="fm-outro">
          <strong>{onField}</strong>
          <span>
            von {players.length} Spielern stehen auf dem Feld
          </span>
          <a className="fm-outro-link" href="/team">
            Zur klassischen Teamübersicht →
          </a>
        </div>
      </div>
    </section>
  );
}
