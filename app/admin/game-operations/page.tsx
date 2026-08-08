import { requireChatGPTUser } from "../../chatgpt-auth";
import { AdminCard, AdminShell } from "../_components/AdminShell";
import "../player-analysis/player-analysis.css";

export const metadata = {
  title: "Spielbetrieb · Rascals OS",
  robots: { index: false, follow: false },
};

const areas = [
  { eyebrow: "SCHEDULE", title: "Spielplan", text: "Spiele, Gegner, Logos, Orte, Termine und Ergebnisse verwalten.", href: "/admin/games", cta: "Spielplan öffnen" },
  { eyebrow: "GAME ROSTER", title: "Gameday Roster", text: "Active/Inactive, Starter, Captains, Emergency- und Special-Teams-Rollen je Spiel festlegen und sperren.", href: "/admin/gameday-roster", cta: "Gameday Roster öffnen" },
  { eyebrow: "LIVE", title: "Gameday Command", text: "Score, Quarter, Liveticker, Events und Live-Spielbetrieb steuern.", href: "/admin/gameday", cta: "Gameday öffnen" },
  { eyebrow: "POSTGAME", title: "Stats Review", text: "Provisional Stats prüfen, korrigieren und anschließend als Official freigeben.", href: "/admin/stats", cta: "Stats Review öffnen" },
] as const;

export default async function GameOperationsPage() {
  await requireChatGPTUser("/admin/game-operations");
  return (
    <AdminShell active="gameoperations" title="Spielbetrieb" eyebrow="RASCALS OS · GAME OPERATIONS">
      <AdminCard className="pa-hero"><div><small>GAME WEEK FLOW</small><h2>Von Spielplan bis Postgame Review in einem Bereich.</h2><p>Der komplette Spieltagsprozess wird über einen zentralen Einstieg geführt, statt auf mehrere Hauptmenüpunkte verteilt zu sein.</p></div></AdminCard>
      <div className="pa-grid">{areas.map(area=><AdminCard key={area.href} className="pa-card"><small>{area.eyebrow}</small><h2>{area.title}</h2><p>{area.text}</p><a className="cms-button" href={area.href}>{area.cta} →</a></AdminCard>)}</div>
    </AdminShell>
  );
}
