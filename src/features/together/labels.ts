import { ACCOMMODATION_DECISION_TITLE } from "@/features/travel/accommodation";

/** Customer copy for a decision title. The stored title stays unchanged for the backend. */
export function displayDecisionTitle(title: string): string {
  return title.trim() === ACCOMMODATION_DECISION_TITLE ? "Kies jullie verblijf" : title;
}

/** One action line per decision state. */
export function decisionStatusLine(status: string, hasOwnVote: boolean): string {
  if (status !== "open") return "Gesloten";
  return hasOwnVote ? "Gestemd" : "Stem nu";
}

export function tasksTileLine(openMine: number): string {
  return openMine === 0 ? "Niets voor jou" : `${openMine} voor jou`;
}

export function decisionsTileLine(waitingForMe: number): string {
  return waitingForMe === 0 ? "Niets te kiezen" : `${waitingForMe} wacht op je stem`;
}
