import { listActivePlayers } from "../lib/football";
import "./team.css";

export const metadata = {
  title: "Team · Hellenstein Rascals",
  description: "Kader der Hellenstein Rascals.",
};

const unitLabels = {
  offense: "OFFENSE",
  defense: "DEFENSE",
  "special-teams": "SPECIAL TEAMS",
} as const;

export default async function TeamPage() {
  const players = await listActivePlayers();
  const units = ["offense", "defense", "special-teams"] as const;

  return (
    <main className="team-public">
      <header className="team-public-head">
        <a href="/">← Startseite</a>
        <span>HELLENSTEIN RASCALS</span>
        <h1>MEET THE <i>ROSTER.</i></h1>
        <p>Spieler, Positionen und Profile der Hellenstein Rascals.</p>
      </header>

      <section className="team-public-body">
        {units.map((unit) => {
          const group = players.filter((player) => player.unit === unit);
          if (!group.length) return null;

          return (
            <section key={unit} className="team-unit">
              <div className="team-unit-title">
                <small>2026 ROSTER</small>
                <h2>{unitLabels[unit]}</h2>
              </div>

              <div className="team-roster-grid">
                {group.map((player) => {
                  const badges = [
                    player.starter ? { type: "starter", icon: "☆", label: "STARTER" } : null,
                    player.captain ? { type: "captain", icon: "C", label: "CAPTAIN" } : null,
                    player.rookie ? { type: "rookie", icon: "R", label: "ROOKIE" } : null,
                  ].filter(Boolean) as { type: string; icon: string; label: string }[];

                  const number = String(player.jerseyNumber ?? 0).padStart(2, "0");
                  const fullName = `${player.firstName} ${player.lastName}`.trim();
                  const nameClass = fullName.length > 22 ? "pc-name pc-name-small" : fullName.length > 17 ? "pc-name pc-name-medium" : "pc-name";

                  return (
                    <a
                      href={`/team/${player.slug}`}
                      className="rascals-player-card"
                      key={player.id}
                      aria-label={`${fullName}, ${player.position}`}
                    >
                      <div className="rpc-frame" aria-hidden="true" />

                      <div className="rpc-brand">
                        <div className="rpc-line" />
                        <div className="rpc-brand-center">
                          <img src="/rascals-logo-transparent-4k.png" alt="" />
                          <b>RASCALS</b>
                        </div>
                        <div className="rpc-line" />
                      </div>

                      <img
                        className="rpc-background-logo"
                        src="/rascals-logo-transparent-4k.png"
                        alt=""
                        aria-hidden="true"
                      />

                      <div className="rpc-smoke rpc-smoke-left" aria-hidden="true" />
                      <div className="rpc-smoke rpc-smoke-right" aria-hidden="true" />

                      <div className="rpc-player-stage">
                        {player.portrait ? (
                          <img
                            className="rpc-player-photo"
                            src={player.portrait}
                            alt={fullName}
                          />
                        ) : (
                          <div className="rpc-player-placeholder">
                            <strong>#{number}</strong>
                            <span>SPIELERFOTO</span>
                          </div>
                        )}
                      </div>

                      <div className="rpc-vignette" aria-hidden="true" />

                      <div className="rpc-player-info">
                        <div className="rpc-number">{number}</div>

                        <div className="rpc-identity">
                          <div className="rpc-position">
                            {player.position}{player.secondaryPosition ? ` / ${player.secondaryPosition}` : ""}
                          </div>
                          <h3 className={nameClass}>{fullName}</h3>
                        </div>
                      </div>

                      {badges.length > 0 && (
                        <div className={`rpc-badges rpc-badges-${badges.length}`}>
                          {badges.map((badge) => (
                            <span className={`rpc-badge ${badge.type}`} key={badge.type}>
                              <i>{badge.icon}</i>
                              <b>{badge.label}</b>
                            </span>
                          ))}
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}

        {!players.length && (
          <div className="team-empty">
            Spieler erscheinen hier automatisch, sobald sie im CMS angelegt und als öffentlich sichtbar markiert wurden.
          </div>
        )}
      </section>
    </main>
  );
}
