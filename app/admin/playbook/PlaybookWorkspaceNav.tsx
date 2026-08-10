"use client";

const sections = [
  { id: "overview", label: "Übersicht", icon: "⌂", href: "#overview" },
  { id: "lineup", label: "Lineup", icon: "◎", href: "#lineup" },
  { id: "formations", label: "Formationen", icon: "▦", href: "#formations" },
  { id: "builder", label: "Play Designer", icon: "✦", href: "#builder" },
  { id: "plays", label: "Playbook", icon: "▤", href: "#plays" },
  { id: "routes", label: "Routes", icon: "↗", href: "#routes" },
  { id: "analysis", label: "Scheme Analysis", icon: "◫", href: "#analysis" },
  { id: "scouting", label: "Opponent Scouting", icon: "⌖", href: "#scouting" },
] as const;

export function PlaybookWorkspaceNav() {
  return (
    <nav className="playbook-workspace-nav" aria-label="Playbook Bereiche">
      {sections.map((section) => (
        <a key={section.id} href={section.href}>
          <span aria-hidden="true">{section.icon}</span>
          <b>{section.label}</b>
        </a>
      ))}
    </nav>
  );
}
