/**
 * POSITIONS, WRITTEN OUT.
 *
 * The CMS stores the short code — LB, QB, FS — because that is what a form
 * with twenty-six options should offer and what anyone filling in a squad
 * actually types. On a card it reads as an abbreviation nobody outside the
 * sport knows: "LB" tells a parent at their first game nothing, "Linebacker"
 * tells them what the person in the photograph does.
 *
 * So the code stays the stored value and this is the display name. Nothing is
 * migrated, nothing in the editor changes, and a squad that was entered as
 * codes keeps working the day somebody types "Linebacker" in full instead.
 *
 * The spellings match the ones already written down for the formation field
 * (team/formation.ts), so the same position cannot end up named two ways on
 * two pages.
 */
const NAMES: Record<string, string> = {
  QB: "Quarterback",
  RB: "Running Back",
  HB: "Halfback",
  FB: "Fullback",
  WR: "Wide Receiver",
  SLOT: "Slot Receiver",
  TE: "Tight End",
  OL: "Offensive Line",
  C: "Center",
  G: "Guard",
  LG: "Left Guard",
  RG: "Right Guard",
  T: "Tackle",
  LT: "Left Tackle",
  RT: "Right Tackle",
  DL: "Defensive Line",
  DE: "Defensive End",
  DT: "Defensive Tackle",
  NT: "Nose Tackle",
  LB: "Linebacker",
  MLB: "Middle Linebacker",
  ILB: "Inside Linebacker",
  OLB: "Outside Linebacker",
  CB: "Cornerback",
  DB: "Defensive Back",
  S: "Safety",
  FS: "Free Safety",
  SS: "Strong Safety",
  K: "Kicker",
  P: "Punter",
  LS: "Long Snapper",
  KR: "Kick Returner",
  PR: "Punt Returner",
  ATH: "Athlete",
};

/**
 * The written-out name for a stored position, or the stored value itself.
 *
 * Anything unrecognised is passed straight through rather than blanked or
 * guessed at. A club that invents its own shorthand, or writes the position
 * out in full already, must still see what it typed — a lookup that only
 * renders what it knows about would quietly empty the one line on the card
 * that says what somebody plays.
 */
export function positionName(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return NAMES[raw.toUpperCase()] ?? raw;
}

/** A position and its second one, written out, as the cards print them. */
export function positionLine(position: string | null | undefined, secondary?: string | null): string {
  const first = positionName(position);
  const second = positionName(secondary);
  if (first && second) return `${first} / ${second}`;
  return first || second;
}
