import { notFound } from "next/navigation";
import { getPlayerBySlug, listPlayerAchievements, listPlayerStats } from "../../lib/football";
import { RascalsPlayerCard } from "../RascalsPlayerCard";
import "../team.css";
import "./player.css";

const STAT_LABELS: Record<string, string> = {
  touchdowns: "Touchdowns",
  tackles: "Tackles",
  sacks: "Sacks",
  interceptions: "Interceptions",
  forced_fumbles: "Forced Fumbles",
  fumble_recoveries: "Fumble Recoveries",
  defensive_touchdowns: "Defensive TD",
  passing_yards: "Passing Yards",
  passing_td: "Passing TD",
  passing_touchdowns: "Passing TD",
  rushing_yards: "Rushing Yards",
  rushing_td: "Rushing TD",
  rushing_touchdowns: "Rushing TD",
  receptions: "Receptions",
  receiving_yards: "Receiving Yards",
  receiving_td: "Receiving TD",
  receiving_touchdowns: "Receiving TD",
  field_goals: "Field Goals",
  extra_points: "PAT",
};

const STAT_ORDER = [
  "touchdowns", "tackles", "interceptions", "sacks", "forced_fumbles", "fumble_recoveries", "defensive_touchdowns",
  "passing_yards", "passing_td", "passing_touchdowns", "rushing_yards", "rushing_td", "rushing_touchdowns",
  "receptions", "receiving_yards", "receiving_td", "receiving_touchdowns", "field_goals", "extra_points",
];

export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const player = await getPlayerBySlug(slug);
  if (!player) notFound();

  const [achievements, rawStats] = await Promise.all([
    listPlayerAchievements(player.id),
    listPlayerStats(player.id, 2026),
  ]);

  const stats = [...rawStats].sort((a, b) => {
    const ai = STAT_ORDER.indexOf(a.key);
    const bi = STAT_ORDER.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const badges = [player.starter ? "STARTER" : null, player.captain ? "CAPTAIN" : null, player.rookie ? "ROOKIE" : null].filter(Boolean);
  const achievementTotal = achievements.reduce((sum, item) => sum + item.quantity, 0);

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
              <div><small>STATUS</small><b>{statusLabel(player.status)}</b></div>
            </div>

            <div className="player-profile-season-strip">
              <div><small>SAISON</small><strong>2026</strong></div>
              <div><small>STAT-KATEGORIEN</small><strong>{stats.length}</strong></div>
              <div><small>ERFOLGE</small><strong>{achievementTotal}</strong></div>
            </div>

            {player.instagram && <a className="player-instagram" href={player.instagram.startsWith("http") ? player.instagram : `https://instagram.com/${player.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">Instagram ↗</a>}
          </div>
        </div>
      </section>

      <section className="player-profile-section stats-section">
        <div className="player-profile-section-head"><div><small>SEASON 2026</small><h2>STATISTIKEN</h2></div><span>Automatisch aus Gameday + Coach-Einträgen</span></div>
        {stats.length > 0 ? <div className="player-stats-grid">{stats.map((stat, index) => <div className={`player-stat ${index < 3 ? "featured" : ""}`} key={stat.key}><strong>{formatStat(stat.value)}</strong><span>{STAT_LABELS[stat.key] ?? stat.key.replaceAll("_", " ")}</span></div>)}</div> : <div className="player-profile-empty">Noch keine Saisonstatistiken eingetragen.</div>}
      </section>

      <section className="player-profile-section achievements-section">
        <div className="player-profile-section-head"><div><small>COACH AWARDS</small><h2>TROPHÄEN & ERFOLGE</h2></div><span>{achievementTotal ? `${achievementTotal} Auszeichnung${achievementTotal === 1 ? "" : "en"}` : "Noch keine Auszeichnungen"}</span></div>
        {achievements.length > 0 ? <div className="player-achievements-grid">{achievements.map((achievement) => <article className="player-achievement" key={achievement.id}><div className="achievement-icon">★</div><div><small>{new Date(achievement.awardedAt).toLocaleDateString("de-DE", { month: "short", year: "numeric" }).toUpperCase()}</small><h3>{achievement.label}{achievement.quantity > 1 ? ` ×${achievement.quantity}` : ""}</h3>{achievement.note && <p>{achievement.note}</p>}</div></article>)}</div> : <div className="player-profile-empty">Noch keine Trophäen vergeben.</div>}
      </section>
    </main>
  );
}

function statusLabel(status: string) {
  return ({ active: "AKTIV", questionable: "QUESTIONABLE", out: "OUT", ir: "IR" } as Record<string, string>)[status] ?? status.toUpperCase();
}

function formatStat(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
}
