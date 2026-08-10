"use client";

const sections = [
  { id: "overview", label: "Übersicht", icon: "⌂" },
  { id: "lineup", label: "Lineup", icon: "◎" },
  { id: "formations", label: "Formationen", icon: "▦" },
  { id: "builder", label: "Play Designer", icon: "✦" },
  { id: "plays", label: "Playbook", icon: "▤" },
  { id: "routes", label: "Routes", icon: "↗" },
  { id: "analysis", label: "Scheme Analysis", icon: "◫" },
  { id: "scouting", label: "Opponent Scouting", icon: "⌖" },
] as const;

function goToSection(id: string) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    return;
  }

  const aliases: Record<string, string[]> = {
    formations: ["lineup", "builder"],
    plays: ["builder"],
    routes: ["builder"],
  };
  for (const fallback of aliases[id] ?? []) {
    const el = document.getElementById(fallback);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
      return;
    }
  }
}

export function PlaybookWorkspaceNav() {
  return (
    <nav className="playbook-workspace-nav" aria-label="Playbook Bereiche">
      {sections.map((section) => (
        <button key={section.id} type="button" onClick={() => goToSection(section.id)}>
          <span aria-hidden="true">{section.icon}</span>
          <b>{section.label}</b>
        </button>
      ))}
    </nav>
  );
}
