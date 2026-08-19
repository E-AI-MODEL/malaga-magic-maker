export interface ProPlan {
  priceId: "vakansie_pro_2" | "vakansie_pro_5" | "vakansie_pro_10";
  label: string;
}

export const PRO_PLANS: ProPlan[] = [
  { priceId: "vakansie_pro_2", label: "€ 2" },
  { priceId: "vakansie_pro_5", label: "€ 5" },
  { priceId: "vakansie_pro_10", label: "€ 10" },
];

export const PRO_BENEFITS = [
  "Onbeperkt reizen (gratis: één actieve reis)",
  "150 Hansie-vragen per dag in plaats van 12",
  "200 documenten per reis in plaats van 5",
  "Blijvende toegang, geen abonnement",
];
