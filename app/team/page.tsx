import { listPublicTeamPlayers } from "../lib/public-team-players";
import { listActiveCoaches } from "../lib/coaches";
import { Header } from "../SiteShell";
import { RascalsPlayerCard } from "./RascalsPlayerCard";
import "./team.css";
import "./coaches-public.css";
import "./team-sections.css";

export const metadata = {
  title: "Team · Hellenstein Rascals",
  description: "Coaches, Offense und Defense der Hellenstein Rascals.",
};

export default async function TeamPage() {
  const [players, coaches] = await Promise.all([listPublicTeamPlayers(), listActiveCoaches()]);
  const offense = players.filter((player) => player.unit === "offense");
  const defense = players.filter((player) => player.unit === "defense");
  const specialTeams = players.filter((player) => player.unit === "special-teams");

  return (
    <>
    <Header page="team" />
    <main className="team-public team-public-v2">
      <header className="team-public-head team-public-hero">
        <a href="/">← Startseite</a>
        <span>HELLENSTEIN RASCALS · 2026</span>
        <h1>ONE TEAM.<br /><i>THREE UNITS.</i></h1>
        <p>Die Coaches geben die Richtung vor. Offense und Defense bringen sie auf das Feld.</p>
        <nav className="team-jump-nav" aria-label="Team Bereiche">
          <a href="#coaches">Coaches</a>
          <a href="#offense">Offense</a>
          <a href="#defense">Defense</a>
        </nav>
      </header>

      <section className="team-public-body team-public-body-v2">
        {coaches.length > 0 && (
          <section id="coaches" className="team-showcase team-showcase-coaches coaches-public-section">
            <div className="team-section-head">
              <div><small>01 · LEADERSHIP</small><h2>COACHES</h2></div>
              <p>Vision, Vorbereitung und Verantwortung. Unser Coaching Staff setzt den Standard für das Team.</p>
            </div>
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

        {offense.length > 0 && (
          <section id="offense" className="team-showcase team-showcase-offense">
            <div className="team-section-head">
              <div><small>02 · MOVE THE CHAINS</small><h2>OFFENSE</h2></div>
              <p>Tempo, Präzision und Explosivität. Die Unit, die Raum gewinnt und Punkte auf das Board bringt.</p>
            </div>
            <div className="team-roster-grid">{offense.map((player) => <RascalsPlayerCard key={player.id} player={player} />)}</div>
          </section>
        )}

        {defense.length > 0 && (
          <section id="defense" className="team-showcase team-showcase-defense">
            <div className="team-section-head">
              <div><small>03 · DEFEND THE STANDARD</small><h2>DEFENSE</h2></div>
              <p>Pressure, Disziplin und Physicality. Die Unit, die Drives stoppt und Momentum dreht.</p>
            </div>
            <div className="team-roster-grid">{defense.map((player) => <RascalsPlayerCard key={player.id} player={player} />)}</div>
          </section>
        )}

        {specialTeams.length > 0 && (
          <section className="team-showcase team-showcase-special">
            <div className="team-section-head compact"><div><small>04 · FIELD POSITION</small><h2>SPECIAL TEAMS</h2></div></div>
            <div className="team-roster-grid">{specialTeams.map((player) => <RascalsPlayerCard key={player.id} player={player} />)}</div>
          </section>
        )}

        {!players.length && !coaches.length && <div className="team-empty">Teammitglieder erscheinen hier automatisch, sobald sie im CMS angelegt und öffentlich sichtbar sind.</div>}
      </section>
    </main>
    </>
  );
}
