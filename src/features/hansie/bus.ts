/** Lets any screen open Hansie, optionally with a question already asked. */
export const HANSIE_ASK_EVENT = "hansie:ask";

export function askHansie(question?: string) {
  window.dispatchEvent(new CustomEvent(HANSIE_ASK_EVENT, { detail: { question: question ?? "" } }));
}

export type HansiePage = "overzicht" | "reis" | "samen" | "trips";

export function hansiePageFromPath(pathname: string): HansiePage {
  if (/^\/trip\/[^/]+\/reis/.test(pathname)) return "reis";
  if (/^\/trip\/[^/]+\/samen/.test(pathname)) return "samen";
  if (/^\/trip\/[^/]+\/?$/.test(pathname)) return "overzicht";
  return "trips";
}

/** Short questions that fit the screen the traveler is on. */
export function hansiePageQuestions(page: HansiePage): string[] {
  switch (page) {
    case "reis":
      return ["Klopt mijn planning zo?", "Wat ontbreekt er nog in de reis?", "Wat kunnen we daar doen?"];
    case "samen":
      return ["Wie moet nog iets doen?", "Hoe staan de kosten ervoor?", "Welke keuzes staan nog open?"];
    case "trips":
      return ["Wat moet ik nog doen voor vertrek?", "Wat kunnen we daar doen?"];
    default:
      return ["Wat is nu het belangrijkst?", "Wat moet ik nog doen voor vertrek?", "Wat kunnen we daar doen?"];
  }
}

export function hansieBarLabel(page: HansiePage): string {
  switch (page) {
    case "reis":
      return "Vraag Hansie naar je planning";
    case "samen":
      return "Vraag Hansie wie wat moet doen";
    default:
      return "Vraag Hansie wat er nog moet";
  }
}
