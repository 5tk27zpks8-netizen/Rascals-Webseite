import "./team-units.css";
import { wide } from "./lib/responsive-image";

/**
 * The team block, below the schedule on the homepage.
 *
 * IT USED TO BE THREE ROSTERS.
 *
 * Offense, Defense and Special Teams, each with its own photograph, its own
 * name and its own paragraph about what that unit does. Three depth charts
 * for a club that fields one team — everybody here plays both ways — and the
 * split survived on the homepage after it had already gone from /team and
 * from the Arena, which left the front page advertising a structure the rest
 * of the site no longer has.
 *
 * The photographs stay, because they are the team and they are what the block
 * is for. What goes is the three names, the three descriptions and the idea
 * that a reader has to pick one: there is one squad and one way in to it.
 */

const photos = [
  { image: "/team-players-4k.webp", alt: "Rascals Spieler vor dem Spiel" },
  { image: "/team-huddle-4k.webp", alt: "Das Team im Huddle" },
  { image: "/team-walk-4k.webp", alt: "Die Rascals auf dem Weg auf das Feld" },
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
        <span className="eyebrow red-text" data-reveal>Das Team</span>
        <h2 data-reveal data-reveal-delay="80">DER GANZE<br /><i>KADER.</i></h2>
      </div>

      <div className="team-units-grid">
        {photos.map((photo, index) => (
          <article key={photo.image} data-reveal data-reveal-delay={index * 90}>
            <div className="team-unit-media">
              <img {...wide(photo.image)} src={photo.image} alt={photo.alt} />
            </div>
          </article>
        ))}
      </div>

      {/* One way in. There were three — one under each unit — and with the
          units gone they would have been three links to the same page. */}
      <div className="team-units-link">
        <a className="text-link" href="/team" data-reveal data-reveal-delay="180">
          Zum Kader <span>→</span>
        </a>
      </div>

      <div className="team-squads">
        {squads.map((squad, index) => (
          <article key={squad.name} data-reveal data-reveal-delay={index * 90}>
            <img {...wide(squad.image)} src={squad.image} alt="" />
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
