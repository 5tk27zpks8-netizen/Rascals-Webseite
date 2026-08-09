import {
  GAMEDAY_BLOCKING_AVAILABILITY,
  GAMEDAY_BLOCKING_ROSTER_STATUSES,
  isActiveRosterStatus,
  isGamedayEligible,
} from "./roster";

export const ACTIVE_ROSTER_STATUSES = ["active", "practice-squad", "reserve", "injured", "suspended"] as const;
export const AVAILABILITY_STATUSES = ["full", "limited", "questionable", "out", "return-to-play"] as const;

/** Compatibility helpers. Canonical eligibility rules live in app/lib/roster.ts. */
export function isSeasonRosterMember(rosterStatus: string) {
  return isActiveRosterStatus(rosterStatus);
}

export function isGameReady(rosterStatus: string, availability: string) {
  return isGamedayEligible(rosterStatus, availability);
}

export function isLimitedAvailability(availability: string) {
  return ["limited", "questionable", "return-to-play"].includes(availability);
}

export function isUnavailable(rosterStatus: string, availability: string) {
  return GAMEDAY_BLOCKING_ROSTER_STATUSES.includes(rosterStatus as never)
    || availability === "out";
}

/** Conservative default used when a Gameday roster is initialized automatically. */
export function shouldInitializeInactive(rosterStatus: string, availability: string) {
  return !isGamedayEligible(rosterStatus, availability)
    || GAMEDAY_BLOCKING_AVAILABILITY.includes(availability as never);
}
