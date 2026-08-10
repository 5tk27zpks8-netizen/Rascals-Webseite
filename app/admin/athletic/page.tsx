import { requireChatGPTUser } from "../../chatgpt-auth";
import { AdminCard, AdminShell } from "../_components/AdminShell";
import "./athletic-hub.css";

export const metadata = {
  title: "Athletic · Rascals OS",
  robots: { index: false, follow: false },
};

const actions = [
  { href: "/admin/athletic/tracking", eyebrow: "MESSWERTE", title: "Tracking", text: "Speed, Agility, Power, Strength, Conditioning und Körperwerte erfassen." },
  { href: "/admin/training-operations", eyebrow: "TRAINING", title: "Training", text: "Trainingseinheiten planen, Periods strukturieren, Drills verwenden und Sessions reviewen." },
  { href: "/admin/development", eyebrow: "ENTWICKLUNG", title: "Development", text: "Individuelle Entwicklungsziele, Skill-Gaps und Position Needs bearbeiten." },
  { href: "/admin/roster-health", eyebrow: "READINESS", title: "Availability", text: "Full, Limited, Questionable, Out und Return-to-Play sauber pflegen." },
  { href: "/admin/player-analysis?tab=performance", eyebrow: "COACH INPUT", title: "Performance Einträge", text: "Training- und Game-Evaluationen für einzelne Spieler erfassen und prüfen." },
  { href: "/admin/player-analysis", eyebrow: "AUSWERTUNG", title: "Zur Analyse", text: "Erfasste Daten im Player 360 auswerten. Keine Bearbeitung, nur Interpretation." },
];

export default async function AthleticPage() {
  await requireChatGPTUser("/admin/athletic");
  return <AdminShell active="athletic" title="Athletic" eyebrow="RASCALS OS · COACH WORKSPACE">
    <div className="ath-hub">
      <section className="ath-hero">
        <div><small>ATHLETIC WORKSPACE</small><h2>Spieler bearbeiten, messen und entwickeln.</h2><p>Alle Coach-Eingaben für körperliche Leistung, Training, Entwicklung und Verfügbarkeit sind hier gebündelt. Wähle einfach den Arbeitsbereich aus.</p></div>
      </section>
      <div className="ath-action-grid">
        {actions.map((item) => <a className="ath-action" href={item.href} key={item.title}><small>{item.eyebrow}</small><h3>{item.title}</h3><p>{item.text}</p><span>Öffnen →</span></a>)}
      </div>
      <AdminCard><div className="cms-section-head"><div><small>WORKFLOW</small><h2>Einfacher Ablauf für Coaches</h2></div></div><div className="ath-flow"><span><b>1</b> Spieler auswählen</span><span><b>2</b> Wert / Status / Training erfassen</span><span><b>3</b> Speichern</span><span><b>4</b> Analyse separat öffnen</span></div></AdminCard>
    </div>
  </AdminShell>;
}
