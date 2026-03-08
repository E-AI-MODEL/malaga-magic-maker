/**
 * Gedeelde label-mappings voor databasewaarden → leesbare Nederlandse labels.
 * Gebruik overal waar raw keys worden getoond: Wensen, Uitslag, Admin, VoteOverviewTable.
 */

export const DIET_LABELS: Record<string, string> = {
  eat_out: "Voorkeur uit eten",
  no_preference: "Geen voorkeur",
  self_cook: "Voorkeur zelf koken",
  no_pork: "Geen varkensvlees",
  allergies: "Voedselallergieën",
  vegetarian: "Vegetarisch",
  vegan: "Veganistisch",
  gluten_free: "Glutenvrij",
  halal: "Halal",
};

export const ACTIVITY_LABELS: Record<string, string> = {
  beach: "Strand / zwemmen",
  padel: "Padel",
  spa: "Spa / wellness",
  hiking: "Wandelen / natuur",
  nightlife: "Uitgaan / nachtleven",
  sightseeing: "Bezienswaardigheden",
  shopping: "Winkelen",
  relaxing: "Gewoon relaxen",
  surfing: "Surfen",
  diving: "Duiken",
  cycling: "Fietsen",
  tennis: "Tennis",
  fishing: "Vissen",
};

export const MOBILITY_LABELS: Record<string, string> = {
  car: "Huurauto",
  transfers: "Taxi / transfer",
  taxi: "Taxi / OV",
  neutral: "Geen voorkeur",
};

export const BASE_LABELS: Record<string, string> = {
  beach: "Strand / centraal",
  golf: "Bij de golfbaan",
  central: "Centraal (stad/strand)",
  neutral: "Geen voorkeur",
};

/** Vertaal een raw databasewaarde naar een leesbaar label. Fallback: de key zelf. */
export function translateLabel(maps: Record<string, string>, key: string): string {
  return maps[key] ?? key;
}

/** Format budget met outlier-bescherming */
export function formatBudget(v: number): string {
  if (v >= 100000) return "Geen limiet";
  if (v >= 1000) return `€${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `€${v}`;
}
