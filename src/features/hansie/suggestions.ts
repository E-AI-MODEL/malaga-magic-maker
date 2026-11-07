const DAY = 24 * 60 * 60 * 1000;

export type HansieTopic = "eten" | "doen" | "gewoonten" | "vervoer" | "vandaag";

/** Local-guide tiles: the main things people ask Hansie at the destination. */
export const HANSIE_TOPICS: { key: HansieTopic; label: string; question: string }[] = [
  { key: "eten", label: "Eten en drinken", question: "Waar eten we vandaag lekker, passend bij onze groep?" },
  { key: "doen", label: "Wat gaan we doen", question: "Wat kunnen we vandaag doen in de buurt, passend bij ons tempo?" },
  { key: "gewoonten", label: "Lokale gewoonten", question: "Welke lokale gewoonten moeten we hier kennen?" },
  { key: "vervoer", label: "Vervoer ter plekke", question: "Hoe komen we hier het makkelijkst van A naar B?" },
  { key: "vandaag", label: "Vandaag en weer", question: "Wat staat er vandaag en wat doet het weer?" },
];

export const HANSIE_FOLLOW_UPS: Record<HansieTopic, string[]> = {
  eten: ["Iets goedkopers", "Hoe komen we daar?"],
  doen: ["Iets voor als het regent", "Hoe komen we daar?"],
  gewoonten: ["Hoe zit het met fooi?", "Pinnen of contant?"],
  vervoer: ["Wat kost een taxi ongeveer?", "Kunnen we lopen?"],
  vandaag: ["Wat staat er morgen?", "Waar eten we vanavond?"],
};

export type HansieSuggestionInput = {
  now: Date;
  startDate: string | null;
  endDate: string | null;
  itemCount: number;
  openDecisionTitle: string | null;
  expenseCount: number;
};

function localMidnight(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).getTime();
}

/** Up to four starter questions that fit where the trip is right now. */
export function hansieSuggestions(input: HansieSuggestionInput): string[] {
  const list: string[] = [];
  const today = new Date(input.now.getFullYear(), input.now.getMonth(), input.now.getDate()).getTime();
  const ended = Boolean(input.startDate) && localMidnight(input.endDate || input.startDate!) < today;
  const started = Boolean(input.startDate) && localMidnight(input.startDate!) <= today;
  // The opening question follows the trip's phase, for any trip.
  if (ended) {
    // After a trip it is mostly settling up, not new planning.
    list.push(input.expenseCount > 0 ? "Wie moet wie nog betalen?" : "Wat moeten we nog afronden?");
  } else if (started) list.push("Wat staat er vandaag op het programma?");
  else list.push("Wat moet ik nog doen voor vertrek?");

  if (input.startDate) {
    const start = localMidnight(input.startDate);
    const end = localMidnight(input.endDate || input.startDate);
    const days = Math.round((start - today) / DAY);
    if (today >= start && today <= end) {
      list.push("Wat staat er morgen?");
    } else if (days >= 0 && days <= 7) {
      const weekday = new Date(start).toLocaleDateString("nl-NL", { weekday: "long" });
      list.push(`Wat moet ik regelen voor ${weekday}?`);
    }
  }
  if (input.openDecisionTitle) list.push(`Wie moet nog stemmen over ${input.openDecisionTitle}?`);
  if (input.expenseCount > 0 && !ended) list.push("Wie moet wie nog betalen?");
  if (input.itemCount > 0 && !ended) list.push("Zitten er gaten in onze planning?");

  return list.slice(0, 4);
}
