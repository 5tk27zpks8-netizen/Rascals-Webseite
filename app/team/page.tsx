import { listActivePlayers } from "../lib/football";
import { RascalsPlayerCard } from "./RascalsPlayerCard";
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
        <h1>
          MEET THE <i>ROSTER.</i>
        </h1>
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
                {group.map((player) => (
                  <RascalsPlayerCard key={player.id} player={player} />
                ))}
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
