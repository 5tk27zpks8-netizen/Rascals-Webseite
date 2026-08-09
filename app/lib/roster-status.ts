export const ACTIVE_ROSTER_STATUSES = ["active", "practice-squad", "reserve", "injured", "suspended"] as const;
export const AVAILABILITY_STATUSES = ["full", "limited", "questionable", "out", "return-to-play"] as const;

export function isSeasonRosterMember(rosterStatus: string) {
  return !["left", "alumni"].includes(rosterStatus);
}

export function isGameReady(rosterStatus: string, availability: string) {
  if (!isSeasonRosterMember(rosterStatus)) return false;
  if (["injured", "suspended"].includes(rosterStatus)) return false;
  return !["out", "return-to-play"].includes(availability);
}

export function isLimitedAvailability(availability: string) {
  return ["limited", "questionable", "return-to-play"].includes(availability);
}

export function isUnavailable(rosterStatus: string, availability: string) {
  return ["injured", "suspended"].includes(rosterStatus) || availability === "out";
}

/** Conservative default used when a Gameday roster is initialized automatically. */
export function shouldInitializeInactive(rosterStatus: string, availability: string) {
  return !isSeasonRosterMember(rosterStatus)
    || ["injured", "suspended"].includes(rosterStatus)
    || ["out", "return-to-play"].includes(availability);
}
