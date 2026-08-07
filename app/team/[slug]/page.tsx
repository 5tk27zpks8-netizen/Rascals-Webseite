import { notFound } from "next/navigation";
import { getPlayerBySlug, listPlayerAchievements, listPlayerStats } from "../../lib/football";
import { RascalsPlayerCard } from "../RascalsPlayerCard";
import "../team.css";
import "./player.css";

const STAT_LABELS: Record<string, string> = {
  tackles: "Tackles",
  sacks: "Sacks",
  interceptions: "Interceptions",
  forced_fumbles: "Forced Fumbles",
  fumble_recoveries: "Fumble Recoveries",
  defensive_touchdowns: "Defensive TD",
  passing_yards: "Passing Yards",
  passing_touchdowns: "Passing TD",
  rushing_yards: "Rushing Yards",
  rushing_touchdowns: "Rushing TD",
  receptions: "Receptions",
  receiving_yards: "Receiving Yards",
  receiving_touchdowns: "Receiving TD",
  field_goals: "Field Goals",
  extra_points: "PAT",
};

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) notFound();

  const [achievements, stats] = await Promise.all([
    listPlayerAchievements(player.id),
    listPlayerStats(player.id, 2026),
  ]);

  const badges = [player.starter ? "STARTER" : null, player.captain ? "CAPTAIN" : null, player.rookie ? "ROOKIE" : null].filter(Boolean);

  return (
    <main className="player-profile">
      <section className="player-profile-hero">
        <a className="player-profile-back" href="/team">← Zurück zum Team</a>
        <div className="player-profile-brand">HELLENSTEIN RASCALS · 2026 ROSTER</div>
        <div className="player-profile-layout">
          <div className="player-profile-card"><RascalsPlayerCard player={player} /></div>
          <div className="player-profile-copy">
            <div className="player-profile-position">{player.position}{player.secondaryPosition ? ` / ${player.secondaryPosition}` : ""}</div>
            <h1><span>#{player.jerseyNumber ?? "–"}</span>{player.firstName}<br />{player.lastName}</h1>
            {badges.length > 0 && <div className="player-profile-badges">{badges.map((badge) => <span key={badge}>{badge}</span>)}</div>}
            {player.bio && <p className="player-profile-bio">{player.bio}</p>}
            <div className="player-profile-facts">
              {player.heightCm && <div><small>GRÖSSE</small><b>{player.heightCm} cm</b></div>}
              {player.weightKg && <div><small>GEWICHT</small><b>{player.weightKg} kg</b></div>}
              {player.joinedYear && <div><small>RASCALS SEIT</small><b>{player.joinedYear}</b></div>}
              <div><small>STATUS</small><b>{player.status.toUpperCase()}</b></div>
            </div>
            {player.instagram && <a className="player-instagram" href={player.instagram.startsWith("http") ? player.instagram : `https://instagram.com/${player.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">Instagram ↗</a>}
          </div>
        </div>
      </section>

      <section className="player-profile-section">
        <div className="player-profile-section-head"><small>SEASON 2026</small><h2>STATISTIKEN</h2></div>
        {stats.length > 0 ? <div className="player-stats-grid">{stats.map((stat) => <div className="player-stat" key={stat.key}><strong>{stat.value}</strong><span>{STAT_LABELS[stat.key] ?? stat.key.replaceAll("_", " ")}</span></div>)}</div> : <div className="player-profile-empty">Noch keine Saisonstatistiken eingetragen.</div>}
      </section>

      <section className="player-profile-section achievements-section">
        <div className="player-profile-section-head"><small>COACH AWARDS</small><h2>TROPHÄEN & ERFOLGE</h2></div>
        {achievements.length > 0 ? <div className="player-achievements-grid">{achievements.map((achievement) => <article className="player-achievement" key={achievement.id}><div className="achievement-icon">★</div><div><small>{new Date(achievement.awardedAt).getFullYear()}</small><h3>{achievement.label}{achievement.quantity > 1 ? ` ×${achievement.quantity}` : ""}</h3>{achievement.note && <p>{achievement.note}</p>}</div></article>)}</div> : <div className="player-profile-empty">Noch keine Trophäen vergeben.</div>}
      </section>
    </main>
  );
}
