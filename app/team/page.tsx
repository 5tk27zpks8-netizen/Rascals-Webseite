import { listActivePlayers } from "../lib/football";
import { listActiveCoaches } from "../lib/coaches";
import { RascalsPlayerCard } from "./RascalsPlayerCard";
import "./team.css";

export const metadata = {
  title: "Team · Hellenstein Rascals",
  description: "Kader und Coaches der Hellenstein Rascals.",
};

const unitLabels = {
  offense: "OFFENSE",
  defense: "DEFENSE",
  "special-teams": "SPECIAL TEAMS",
} as const;

export default async function TeamPage() {
  const [players, coaches] = await Promise.all([listActivePlayers(), listActiveCoaches()]);
  const units = ["offense", "defense", "special-teams"] as const;

  return (
    <main className="team-public">
      <header className="team-public-head">
        <a href="/">← Startseite</a>
        <span>HELLENSTEIN RASCALS</span>
        <h1>MEET THE <i>ROSTER.</i></h1>
        <p>Spieler, Positionen, Coaches und Profile der Hellenstein Rascals.</p>
      </header>

      <section className="team-public-body">
        {units.map((unit) => {
          const group = players.filter((player) => player.unit === unit);
          if (!group.length) return null;
          return (
            <section key={unit} className="team-unit">
              <div className="team-unit-title"><small>2026 ROSTER</small><h2>{unitLabels[unit]}</h2></div>
              <div className="team-roster-grid">{group.map((player) => <RascalsPlayerCard key={player.id} player={player} />)}</div>
            </section>
          );
        })}

        {coaches.length > 0 && (
          <section className="team-unit coaches-public-section">
            <div className="team-unit-title"><small>COACHING STAFF</small><h2>COACHES</h2></div>
            <div className="coaches-public-grid">
              {coaches.map((coach) => (
                <article className="coach-public-card" key={coach.id}>
                  <div className="coach-public-photo">
                    {coach.photo ? <img src={coach.photo} alt={`${coach.firstName} ${coach.lastName}`} /> : <div className="coach-public-placeholder">R</div>}
                    <img className="coach-public-watermark" src="/rascals-logo-transparent-4k.png" alt="" />
                  </div>
                  <div className="coach-public-info">
                    <span>{coach.role || "COACH"}</span>
                    <h3>{coach.firstName}<br />{coach.lastName}</h3>
                    {coach.bio && <p>{coach.bio}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {!players.length && !coaches.length && <div className="team-empty">Teammitglieder erscheinen hier automatisch, sobald sie im CMS angelegt und öffentlich sichtbar sind.</div>}
      </section>
    </main>
  );
}
