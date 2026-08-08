import { requireChatGPTUser } from "../../chatgpt-auth";
import { AdminCard, AdminShell } from "../_components/AdminShell";
import "../player-analysis/player-analysis.css";

export const metadata = {
  title: "Team & Kader · Rascals OS",
  robots: { index: false, follow: false },
};

const areas = [
  { eyebrow: "PLAYER MASTER", title: "Spieler", text: "Spielerstammdaten, Portraits und öffentliche Profile verwalten.", href: "/admin/players", cta: "Spieler öffnen" },
  { eyebrow: "SEASON", title: "Season Roster", text: "Saisonbezogene Nummern, Positionen, Status, Starter, Captains und Roster Memberships pflegen.", href: "/admin/roster", cta: "Season Roster öffnen" },
  { eyebrow: "DEPTH", title: "Depth Chart", text: "Starter, Backups und Positionsreihenfolgen mit historisierten Snapshots verwalten.", href: "/admin/depth-chart", cta: "Depth Chart öffnen" },
  { eyebrow: "PLANNING", title: "Roster Health", text: "Positionsstärke, Game-Ready-Quote, Roster Gaps, Recruiting Needs und nächste Saison planen.", href: "/admin/roster-health", cta: "Roster Health öffnen" },
  { eyebrow: "STAFF", title: "Coaches", text: "Coaching Staff, Rollen und öffentliche Darstellung verwalten.", href: "/admin/coaches", cta: "Coaches öffnen" },
] as const;

export default async function TeamManagementPage() {
  await requireChatGPTUser("/admin/team-management");
  return (
    <AdminShell active="teammanagement" title="Team & Kader" eyebrow="RASCALS OS · TEAM MANAGEMENT">
      <AdminCard className="pa-hero"><div><small>ROSTER OPERATIONS</small><h2>Spieler, Saisonkader und Depth Management zusammengeführt.</h2><p>Alle Kaderfunktionen bleiben fachlich sauber getrennt, sind aber über einen einzigen Einstieg erreichbar.</p></div></AdminCard>
      <div className="pa-grid">{areas.map(area=><AdminCard key={area.href} className="pa-card"><small>{area.eyebrow}</small><h2>{area.title}</h2><p>{area.text}</p><a className="cms-button" href={area.href}>{area.cta} →</a></AdminCard>)}</div>
    </AdminShell>
  );
}
