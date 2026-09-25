import type { Player } from "../lib/football";

/**
 * Turns a roster into a football formation laid out on the field.
 *
 * The field runs horizontally, so the line of scrimmage is vertical and the
 * formation reads front-to-back along the scroll axis: backfield, then the
 * line, then across the ball into the front seven and the secondary. Scrolling
 * sideways therefore walks through the formation the way a play develops.
 *
 * Every slot is drawn whether or not somebody fills it. A roster with no
 * positions maintained still renders a complete, legible formation of empty
 * outlines, and each one names the position it is waiting for — so the page
 * doubles as a depth chart that shows the club exactly what is left to fill in.
 */

export type Slot = {
  /** Position code the slot is drawn for, e.g. "QB". */
  pos: string;
  /** Percentage across the field zone; 0 is the left edge. */
  x: number;
  /** Percentage down the field zone; 0 is the top sideline. */
  y: number;
  /** Spelled-out position, shown on the empty outline. */
  label: string;
};

export type FilledSlot = Slot & {
  player: Player | null;
  /** Backups behind the starter, drawn stacked into the depth of the field. */
  depth: Player[];
};

export type FormationGroup = {
  id: string;
  title: string;
  kicker: string;
  blurb: string;
  slots: FilledSlot[];
};

/* ------------------------------------------------------------------ *
 * Slot layouts
 *
 * Offense attacks to the right, so the backfield sits left of the line
 * and the defence mirrors it across the ball.
 * ------------------------------------------------------------------ */

/*
 * Spacing rule for every layout below: a marker is about 120px wide and 95px
 * tall. On a field roughly 3700x780, that is ~3.3% horizontally and ~12%
 * vertically, so slots sharing a column are kept >=14% apart in y, and slots at
 * a similar height >=4.5% apart in x. Two markers only collide when they
 * overlap on both axes, which is why the receivers can sit at extreme y values
 * as long as they stay clear of the line in x.
 */

const OFFENSE: Slot[] = [
  // Backfield
  { pos: "RB", x: 8.0, y: 50, label: "Running Back" },
  { pos: "FB", x: 14.1, y: 36, label: "Fullback" },
  { pos: "QB", x: 21.4, y: 50, label: "Quarterback" },
  // Receivers, split wide and kept clear of the line in x
  { pos: "SLOT", x: 21.4, y: 17, label: "Slot Receiver" },
  { pos: "WR", x: 28.7, y: 9, label: "Wide Receiver" },
  { pos: "WR", x: 28.7, y: 91, label: "Wide Receiver" },
  // Offensive line, shoulder to shoulder on the ball
  { pos: "LT", x: 36.0, y: 14, label: "Left Tackle" },
  { pos: "LG", x: 36.0, y: 27, label: "Left Guard" },
  { pos: "C", x: 36.0, y: 41, label: "Center" },
  { pos: "RG", x: 36.0, y: 55, label: "Right Guard" },
  { pos: "RT", x: 36.0, y: 69, label: "Right Tackle" },
  { pos: "TE", x: 36.0, y: 83, label: "Tight End" },
];

const DEFENSE: Slot[] = [
  // Defensive line, across the ball from the offensive line
  { pos: "DE", x: 49.4, y: 19, label: "Defensive End" },
  { pos: "DT", x: 49.4, y: 36, label: "Defensive Tackle" },
  { pos: "DT", x: 49.4, y: 55, label: "Defensive Tackle" },
  { pos: "DE", x: 49.4, y: 74, label: "Defensive End" },
  // Corners press the receivers, so they stay wide
  { pos: "CB", x: 56.7, y: 9, label: "Cornerback" },
  { pos: "CB", x: 56.7, y: 91, label: "Cornerback" },
  // Linebackers
  { pos: "OLB", x: 65.2, y: 25, label: "Outside Linebacker" },
  { pos: "MLB", x: 65.2, y: 50, label: "Middle Linebacker" },
  { pos: "OLB", x: 65.2, y: 75, label: "Outside Linebacker" },
  // Secondary, deepest of all
  { pos: "SS", x: 77.4, y: 33, label: "Strong Safety" },
  { pos: "FS", x: 77.4, y: 67, label: "Free Safety" },
];

const SPECIAL: Slot[] = [
  { pos: "K", x: 92.0, y: 30, label: "Kicker" },
  { pos: "P", x: 92.0, y: 50, label: "Punter" },
  { pos: "LS", x: 92.0, y: 70, label: "Long Snapper" },
];

/* ------------------------------------------------------------------ *
 * Position normalisation
 * ------------------------------------------------------------------ */

/** Spelled-out and loosely written positions map onto the slot codes. */
const ALIASES: Record<string, string> = {
  QUARTERBACK: "QB",
  RUNNINGBACK: "RB", HALFBACK: "RB", HB: "RB", TAILBACK: "RB",
  FULLBACK: "FB",
  WIDERECEIVER: "WR", RECEIVER: "WR", WIDEOUT: "WR",
  SLOTRECEIVER: "SLOT", SLOTWR: "SLOT",
  TIGHTEND: "TE",
  CENTER: "C", CENTRE: "C",
  LEFTGUARD: "LG", RIGHTGUARD: "RG", GUARD: "LG",
  LEFTTACKLE: "LT", RIGHTTACKLE: "RT", TACKLE: "LT",
  OFFENSIVELINE: "C", OL: "C", OLINE: "C",
  DEFENSIVEEND: "DE", DEFENSIVETACKLE: "DT", NOSETACKLE: "DT", NT: "DT",
  DEFENSIVELINE: "DT", DL: "DT", DLINE: "DT",
  LINEBACKER: "MLB", LB: "MLB", INSIDELINEBACKER: "MLB", ILB: "MLB",
  MIDDLELINEBACKER: "MLB", OUTSIDELINEBACKER: "OLB",
  CORNERBACK: "CB", CORNER: "CB",
  SAFETY: "FS", STRONGSAFETY: "SS", FREESAFETY: "FS", S: "FS",
  DEFENSIVEBACK: "CB", DB: "CB",
  KICKER: "K", PLACEKICKER: "K", PK: "K",
  PUNTER: "P",
  LONGSNAPPER: "LS", SNAPPER: "LS",
};

/** "Wide Receiver", "wr", "W.R." and "WR/KR" all resolve to WR. */
export function normalizePosition(raw: string): string {
  const cleaned = String(raw ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!cleaned) return "";
  return ALIASES[cleaned] ?? cleaned;
}

/* ------------------------------------------------------------------ *
 * Assignment
 * ------------------------------------------------------------------ */

/**
 * Seats players into slots, preferring their primary position and falling back
 * to their secondary one. Starters and captains take the slot; everyone else at
 * that position stacks behind as depth. Players whose position does not resolve
 * are handed back so the page can show them rather than drop them.
 */
export function buildFormation(players: Player[]): {
  groups: FormationGroup[];
  unassigned: Player[];
} {
  const remaining = new Set(players);
  const byCode = new Map<string, Player[]>();

  for (const player of players) {
    const primary = normalizePosition(player.position);
    const secondary = normalizePosition(player.secondaryPosition);
    const code = primary || secondary;
    if (!code) continue;
    const bucket = byCode.get(code);
    if (bucket) bucket.push(player);
    else byCode.set(code, [player]);
  }

  // A starter outranks a captain, who outranks a shirt number, so the most
  // senior player at a position is the one drawn in the slot itself.
  for (const bucket of byCode.values()) {
    bucket.sort((a, b) => {
      if (a.starter !== b.starter) return a.starter ? -1 : 1;
      if (a.captain !== b.captain) return a.captain ? -1 : 1;
      const an = a.jerseyNumber ?? 999;
      const bn = b.jerseyNumber ?? 999;
      if (an !== bn) return an - bn;
      return a.lastName.localeCompare(b.lastName, "de");
    });
  }

  const fill = (slots: Slot[]): FilledSlot[] =>
    slots.map((slot) => {
      const bucket = byCode.get(slot.pos);
      const player = bucket?.shift() ?? null;
      if (player) remaining.delete(player);
      return { ...slot, player, depth: [] };
    });

  const offense = fill(OFFENSE);
  const defense = fill(DEFENSE);
  const special = fill(SPECIAL);

  // Anyone still queued at a position shares that position's last slot as depth,
  // so a deep roster stacks behind the starter instead of vanishing.
  const allSlots = [...offense, ...defense, ...special];
  for (const [code, bucket] of byCode) {
    if (!bucket.length) continue;
    const host = [...allSlots].reverse().find((slot) => slot.pos === code);
    if (!host) continue;
    host.depth.push(...bucket);
    for (const player of bucket) remaining.delete(player);
    bucket.length = 0;
  }

  return {
    groups: [
      {
        id: "offense",
        title: "OFFENSE",
        kicker: "01 · MOVE THE CHAINS",
        blurb: "Backfield, Line und Receiver — die Unit, die Raum gewinnt.",
        slots: offense,
      },
      {
        id: "defense",
        title: "DEFENSE",
        kicker: "02 · DEFEND THE STANDARD",
        blurb: "Front Seven und Secondary — die Unit, die Drives stoppt.",
        slots: defense,
      },
      {
        id: "special",
        title: "SPECIAL TEAMS",
        kicker: "03 · FIELD POSITION",
        blurb: "Kicking Game — jeder Yard zählt.",
        slots: special,
      },
    ],
    unassigned: [...remaining],
  };
}
