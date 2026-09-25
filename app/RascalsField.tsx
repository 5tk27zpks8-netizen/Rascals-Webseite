import "./rascals-field.css";

/**
 * A football field drawn behind a section.
 *
 * Deliberately quiet: every line inherits the section's own text colour and
 * the whole layer is held at a low opacity, so it reads as texture on any
 * background the CMS sets — the green Spielplan section as much as the light
 * legacy one — without competing with the fixtures in front of it.
 *
 * Drawn in two layers on purpose. The markings stretch to fill whatever shape
 * the section happens to be (`preserveAspectRatio="none"`), so both end zones
 * and both goal posts stay in frame at any section height — cropping to fit
 * would throw them away exactly when a section is tall. Stretching is
 * invisible on straight lines but would deform type, so the yard numbers are
 * HTML positioned by percentage over the top instead of text inside the SVG.
 */

const VIEW_W = 1280;
const VIEW_H = 430;

const END_LINE_LEFT = 62;
const END_LINE_RIGHT = VIEW_W - 62;
const END_ZONE = 104;
const GOAL_LEFT = END_LINE_LEFT + END_ZONE;
const GOAL_RIGHT = END_LINE_RIGHT - END_ZONE;

/** 100 yards between the goal lines. */
const YARD = (GOAL_RIGHT - GOAL_LEFT) / 100;

/** Every five yards, with the ten-yard lines drawn heavier. */
const yardLines = Array.from({ length: 21 }, (_, index) => GOAL_LEFT + index * 5 * YARD);

/** One tick per yard, skipping the yards that already carry a line. */
const hashMarks = Array.from({ length: 99 }, (_, index) => GOAL_LEFT + (index + 1) * YARD)
  .filter((_, index) => (index + 1) % 5 !== 0);

/** 10, 20, 30, 40, 50, 40, 30, 20, 10 — counted up to midfield and back down. */
const yardNumbers = Array.from({ length: 9 }, (_, index) => ({
  left: ((GOAL_LEFT + (index + 1) * 10 * YARD) / VIEW_W) * 100,
  label: String((index <= 4 ? index + 1 : 9 - index) * 10),
}));

const HASH_TOP = 168;
const HASH_BOTTOM = VIEW_H - 168;
const MID_Y = VIEW_H / 2;
const CROSSBAR = 74;

function GoalPost({ x, direction }: { x: number; direction: 1 | -1 }) {
  const base = x - direction * 34;
  const capTop = MID_Y - CROSSBAR / 2;
  const capBottom = MID_Y + CROSSBAR / 2;
  return (
    <g className="rascals-field-goal">
      {/* the gooseneck out from the end line, then the crossbar */}
      <line x1={x} y1={MID_Y} x2={base} y2={MID_Y} />
      <line x1={base} y1={capTop} x2={base} y2={capBottom} />
      {/* uprights, as ticks rather than circles so stretching cannot deform them */}
      <line x1={base} y1={capTop} x2={base - direction * 16} y2={capTop} />
      <line x1={base} y1={capBottom} x2={base - direction * 16} y2={capBottom} />
    </g>
  );
}

export function RascalsField() {
  return (
    <div className="rascals-field" aria-hidden="true">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" focusable="false">
        {/* End zones, tinted so the painted ends read even where lines are faint */}
        <rect className="rascals-field-endzone" x={END_LINE_LEFT} y={0} width={END_ZONE} height={VIEW_H} />
        <rect className="rascals-field-endzone" x={GOAL_RIGHT} y={0} width={END_ZONE} height={VIEW_H} />

        {/* End lines and goal lines */}
        {[END_LINE_LEFT, GOAL_LEFT, GOAL_RIGHT, END_LINE_RIGHT].map((x) => (
          <line key={`edge-${x}`} className="rascals-field-yard major" x1={x} y1={0} x2={x} y2={VIEW_H} />
        ))}

        {/* Yard lines */}
        {yardLines.map((x) => (
          <line
            key={`yard-${Math.round(x)}`}
            className={Math.round((x - GOAL_LEFT) / YARD) % 10 === 0 ? "rascals-field-yard major" : "rascals-field-yard"}
            x1={x}
            y1={0}
            x2={x}
            y2={VIEW_H}
          />
        ))}

        {/* Hash marks */}
        {hashMarks.map((x) => (
          <g key={`hash-${Math.round(x)}`} className="rascals-field-hash">
            <line x1={x} y1={HASH_TOP - 7} x2={x} y2={HASH_TOP + 7} />
            <line x1={x} y1={HASH_BOTTOM - 7} x2={x} y2={HASH_BOTTOM + 7} />
          </g>
        ))}

        <GoalPost x={END_LINE_LEFT} direction={1} />
        <GoalPost x={END_LINE_RIGHT} direction={-1} />
      </svg>

      <div className="rascals-field-numbers">
        {yardNumbers.map(({ left, label }) => (
          <span key={`top-${label}-${Math.round(left)}`} className="near" style={{ left: `${left}%` }}>{label}</span>
        ))}
        {yardNumbers.map(({ left, label }) => (
          <span key={`far-${label}-${Math.round(left)}`} className="far" style={{ left: `${left}%` }}>{label}</span>
        ))}
      </div>
    </div>
  );
}
