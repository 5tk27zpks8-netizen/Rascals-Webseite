import { requireChatGPTUser } from "../../chatgpt-auth";
import { AdminCard, AdminShell } from "../_components/AdminShell";
import "./player-analysis.css";

export const metadata = {
  title: "Spieler & Analyse · Rascals OS",
  robots: { index: false, follow: false },
};

const areas = [
  { eyebrow: "HEAD COACH", title: "Team Development", text: "Gesamtbild über alle Positionsgruppen: Team Needs, Coverage, Trends, offene Goals und Player Watchlist.", href: "/admin/development/team", cta: "Team Analyse öffnen" },
  { eyebrow: "POSITION COACH", title: "Position Development", text: "QB, RB, WR/TE, OL, DL, LB, DB und Special Teams mit Skill Matrix, Coach Evaluation, Evidence und Development Goals.", href: "/admin/development/positions", cta: "Position Rooms öffnen" },
  { eyebrow: "PLAYER", title: "Spieler Performance", text: "Training, Attendance, Einsatz, Leistung und Performance-Einträge auf Spielerebene erfassen und auswerten.", href: "/admin/performance", cta: "Performance öffnen" },
  { eyebrow: "STATS", title: "Statistik & Review", text: "Provisional, Reviewed und Official Stats prüfen sowie Game-, Season- und Career-Auswertungen aufrufen.", href: "/admin/stats", cta: "Stats öffnen" },
  { eyebrow: "DEVELOPMENT", title: "Development Overview", text: "Zentrale Entwicklungsübersicht und Einstieg in individuelle Entwicklungsprozesse.", href: "/admin/development", cta: "Entwicklung öffnen" },
  { eyebrow: "SPECIALIST", title: "Linebacker Lab", text: "Spezialisierter Referenzraum für Linebacker mit erweiterten Trends, Drill-Verknüpfungen und Position-Room-Analytics.", href: "/admin/development/linebackers", cta: "LB Lab öffnen" },
] as const;

export default async function PlayerAnalysisPage() {
  await requireChatGPTUser("/admin/player-analysis");
  return (
    <AdminShell active="playeranalysis" title="Spieler & Analyse" eyebrow="RASCALS OS · PERFORMANCE CENTER">
      <AdminCard className="pa-hero">
        <div>
          <small>ONE ENTRY POINT</small>
          <h2>Alle Leistungs- und Entwicklungsdaten an einem Ort.</h2>
          <p>Performance, Stats, Coach-Evaluationen, Development, Positionsgruppen und Team-Needs bleiben technisch getrennte Module, werden im CMS aber über einen gemeinsamen Arbeitsbereich bedient.</p>
        </div>
      </AdminCard>

      <div className="pa-grid">
        {areas.map((area) => (
          <AdminCard key={area.href} className="pa-card">
            <small>{area.eyebrow}</small>
            <h2>{area.title}</h2>
            <p>{area.text}</p>
            <a className="cms-button" href={area.href}>{area.cta} →</a>
          </AdminCard>
        ))}
      </div>
    </AdminShell>
  );
}
