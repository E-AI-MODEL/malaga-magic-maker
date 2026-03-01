export interface Accommodation {
  id: string;
  name: string;
  type: string;
  location_label: string;
  lat: number;
  lng: number;
  image_urls: string[];
  listing_url: string | null;
  sources: any[];
  total_price_3_nights: number | null;
  currency: string;
  price_notes: string | null;
  bedrooms: number;
  bathrooms: number;
  fixed_beds_count: number;
  max_guests: number;
  cancellation_type: string;
  parking: string;
  golf_km: number | null;
  golf_minutes: number | null;
  beach_meters: number | null;
  agp_minutes: number | null;
  notes: string | null;
  tags: string[];
  status: string;
  eliminated_reason: string | null;
  transparent_price_confirmed: boolean;
}

export interface Submission {
  id: string;
  user_id: string;
  agreed_facts: boolean;
  preferred_rounds: number;
  mobility_choice: string;
  base_choice: string;
  max_golf_minutes: number;
  require_fixed_beds: boolean;
  require_bedrooms_3: boolean;
  require_cancelable: boolean;
  require_transparent_price: boolean;
  budget_cap_total: number | null;
  points_golf_ease: number;
  points_beach_life: number;
  points_exploring: number;
  points_luxury: number;
  points_budget: number;
  points_low_hassle: number;
  locked: boolean;
}

export interface GroupRules {
  requireFixedBeds: boolean;
  requireBedrooms3: boolean;
  requireCancelable: boolean;
  requireTransparentPrice: boolean;
  maxGolfMinutes: number;
  budgetCap: number | null;
}

export function computeGroupRules(submissions: Submission[]): GroupRules {
  const n = submissions.length;
  if (n === 0) return { requireFixedBeds: false, requireBedrooms3: false, requireCancelable: false, requireTransparentPrice: false, maxGolfMinutes: 20, budgetCap: null };

  const majority = Math.ceil(n / 2);
  const count = (fn: (s: Submission) => boolean) => submissions.filter(fn).length;

  const golfMinVotes = submissions.map(s => s.max_golf_minutes).sort((a, b) => a - b);
  // Take median for strictest majority
  const maxGolfMinutes = golfMinVotes[Math.floor(n / 2)];

  const budgets = submissions.map(s => s.budget_cap_total).filter((b): b is number => b !== null && b > 0);
  const budgetCap = budgets.length >= majority ? Math.min(...budgets) : null;

  return {
    requireFixedBeds: count(s => s.require_fixed_beds) >= majority,
    requireBedrooms3: count(s => s.require_bedrooms_3) >= majority,
    requireCancelable: count(s => s.require_cancelable) >= majority,
    requireTransparentPrice: count(s => s.require_transparent_price) >= majority,
    maxGolfMinutes,
    budgetCap,
  };
}

export interface EligibilityResult {
  eligible: boolean;
  failures: string[];
}

export function checkEligibility(acc: Accommodation, rules: GroupRules): EligibilityResult {
  const failures: string[] = [];
  if (rules.requireFixedBeds && acc.fixed_beds_count < 5) failures.push("Te weinig vaste bedden (nodig: 5)");
  if (rules.requireBedrooms3 && acc.bedrooms < 3) failures.push("Te weinig slaapkamers (nodig: 3)");
  if (rules.requireCancelable && acc.cancellation_type === "nonref") failures.push("Niet annuleerbaar");
  if (rules.requireTransparentPrice && !acc.transparent_price_confirmed && acc.total_price_3_nights === null) failures.push("Prijs niet transparant");
  if (acc.golf_minutes != null && acc.golf_minutes > rules.maxGolfMinutes) failures.push(`Golf te ver (${acc.golf_minutes} min > max ${rules.maxGolfMinutes})`);
  if (rules.budgetCap && acc.total_price_3_nights != null && acc.total_price_3_nights > rules.budgetCap) failures.push("Boven budget");
  return { eligible: failures.length === 0, failures };
}

export function computeAvgPoints(submissions: Submission[]) {
  const n = submissions.length || 1;
  return {
    golfEase: submissions.reduce((s, sub) => s + sub.points_golf_ease, 0) / n,
    beachLife: submissions.reduce((s, sub) => s + sub.points_beach_life, 0) / n,
    exploring: submissions.reduce((s, sub) => s + sub.points_exploring, 0) / n,
    luxury: submissions.reduce((s, sub) => s + sub.points_luxury, 0) / n,
    budget: submissions.reduce((s, sub) => s + sub.points_budget, 0) / n,
    lowHassle: submissions.reduce((s, sub) => s + sub.points_low_hassle, 0) / n,
  };
}

export function computeMatchScores(acc: Accommodation, allActive: Accommodation[]) {
  // Golf ease
  const gm = acc.golf_minutes ?? 30;
  const golfEase = gm <= 5 ? 1.0 : gm <= 12 ? 0.7 : gm <= 20 ? 0.4 : 0.1;

  // Beach life
  const bm = acc.beach_meters ?? 10000;
  const beachLife = bm <= 800 ? 1.0 : bm <= 1500 ? 0.6 : 0.2;

  // Exploring
  const locMap: Record<string, number> = { "La Cala de Mijas": 1.0, "Fuengirola": 0.8, "Calahonda": 0.7, "La Cala Golf": 0.4, "Mijas": 0.6 };
  const exploring = locMap[acc.location_label] ?? 0.6;

  // Luxury
  const hasPoolOrSpa = acc.tags.some(t => t === "pool" || t === "spa");
  const luxury = (acc.bathrooms >= 2 && hasPoolOrSpa) ? 1.0 : acc.bathrooms >= 2 ? 0.7 : 0.4;

  // Budget (normalize within active set)
  const prices = allActive.map(a => a.total_price_3_nights).filter((p): p is number => p !== null);
  let budget = 0.5;
  if (prices.length > 0 && acc.total_price_3_nights != null) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    budget = max === min ? 1.0 : 1.0 - 0.8 * (acc.total_price_3_nights - min) / (max - min);
  }

  // Low hassle
  let hassleScore = 0;
  if (acc.parking === "yes") hassleScore++;
  if (acc.cancellation_type === "free") hassleScore++;
  if (acc.transparent_price_confirmed) hassleScore++;
  const lowHassle = hassleScore === 3 ? 1.0 : hassleScore === 2 ? 0.7 : hassleScore === 1 ? 0.4 : 0.2;

  return { golfEase, beachLife, exploring, luxury, budget, lowHassle };
}

export interface RankedAccommodation extends Accommodation {
  totalScore: number;
  matchScores: ReturnType<typeof computeMatchScores>;
  eligibility: EligibilityResult;
  topReasons: string[];
}

export function rankAccommodations(
  accommodations: Accommodation[],
  submissions: Submission[],
  rules: GroupRules
): RankedAccommodation[] {
  const avgPoints = computeAvgPoints(submissions);
  const active = accommodations.filter(a => a.status !== "eliminated");

  return accommodations.map(acc => {
    const matchScores = computeMatchScores(acc, active);
    const eligibility = checkEligibility(acc, rules);

    const contributions = [
      { label: "Golf gemak", value: avgPoints.golfEase * matchScores.golfEase },
      { label: "Strand/leven", value: avgPoints.beachLife * matchScores.beachLife },
      { label: "Omgeving", value: avgPoints.exploring * matchScores.exploring },
      { label: "Comfort/luxe", value: avgPoints.luxury * matchScores.luxury },
      { label: "Budget", value: avgPoints.budget * matchScores.budget },
      { label: "Min. gedoe", value: avgPoints.lowHassle * matchScores.lowHassle },
    ].sort((a, b) => b.value - a.value);

    const totalScore = contributions.reduce((s, c) => s + c.value, 0);
    const topReasons = contributions.slice(0, 3).map(c => `${c.label}: ${c.value.toFixed(1)} pts`);

    return { ...acc, totalScore, matchScores, eligibility, topReasons };
  }).sort((a, b) => b.totalScore - a.totalScore);
}
