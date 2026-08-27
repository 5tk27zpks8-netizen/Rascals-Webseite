import "./team-units.css";

/**
 * The teams block, sitting below the schedule on the homepage.
 *
 * Carried over from the alternative design that was reviewed, with the
 * photography left in colour rather than the greyscale that suited that
 * page's paper palette.
 */

const units = [
  {
    name: "OFFENSE",
    line: "Ball. Yards. Punkte.",
    text: "Line, Backfield und Receiver — elf Spieler, ein Spielzug, kein Alleingang.",
    image: "/team-players-4k.webp",
  },
  {
    name: "DEFENSE",
    line: "Stoppen. Zurückholen.",
    text: "Front, Linebacker und Secondary. Wer hier steht, gibt keinen Meter freiwillig her.",
    image: "/team-huddle-4k.webp",
  },
  {
    name: "SPECIAL TEAMS",
    line: "Ein Snap entscheidet.",
    text: "Kick, Punt, Return. Die Phase, die Spiele dreht und die keiner trainiert sehen will.",
    image: "/team-walk-4k.webp",
  },
];

const squads = [
  {
    tag: "SENIORS · AB 18",
    name: "TACKLE FOOTBALL",
    text: "Wettkampf, Technik und Athletik – mit einem Team, das dich fordert und trägt.",
    image: "/team-walk-4k.webp",
  },
  {
    tag: "JUNIORS · 14–18",
    name: "NEXT GENERATION",
    text: "Grundlagen sicher lernen, Verantwortung übernehmen und als Spieler wachsen.",
    image: "/team-juniors-new-4k.webp",
  },
];

export function TeamUnits() {
  return (
    <section className="team-units">
      <div className="team-units-head">
        <span className="eyebrow red-text" data-reveal>Die Teams</span>
        <h2 data-reveal data-reveal-delay="80">DREI UNITS.<br /><i>EIN TEAM.</i></h2>
      </div>

      <div className="team-units-grid">
        {units.map((unit, index) => (
          <article key={unit.name} data-reveal data-reveal-delay={index * 90}>
            <div className="team-unit-media">
              <img src={unit.image} alt="" />
              <span className="team-unit-index">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <h3>{unit.name}</h3>
            <strong>{unit.line}</strong>
            <p>{unit.text}</p>
          </article>
        ))}
      </div>

      <div className="team-squads">
        {squads.map((squad, index) => (
          <article key={squad.name} data-reveal data-reveal-delay={index * 90}>
            <img src={squad.image} alt="" />
            <div>
              <small>{squad.tag}</small>
              <h3>{squad.name}</h3>
              <p>{squad.text}</p>
              <a className="text-link" href="/team">Zum Team <span>→</span></a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
