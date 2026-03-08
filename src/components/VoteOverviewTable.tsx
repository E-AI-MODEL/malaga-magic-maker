import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Submission, GroupRules } from "@/lib/scoring";

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

interface Props {
  submissions: Submission[];
  rules: GroupRules;
  profiles: Profile[];
}

export function VoteOverviewTable({ submissions, rules, profiles }: Props) {
  const getName = (userId: string) =>
    profiles.find((p) => p.id === userId)?.display_name || "?";

  const lockedSubs = useMemo(
    () => submissions.filter((s) => s.locked),
    [submissions]
  );
  const n = lockedSubs.length;
  if (n === 0) return null;

  const countBool = (field: keyof Submission) => ({
    yes: lockedSubs.filter((s) => s[field] === true).length,
    no: lockedSubs.filter((s) => s[field] === false).length,
  });

  const countVal = (field: keyof Submission, value: any) =>
    lockedSubs.filter((s) => s[field] === value).length;

  const requirements: {
    label: string;
    field: keyof Submission;
    active: boolean;
  }[] = [
    { label: "Vaste bedden", field: "require_fixed_beds", active: rules.requireFixedBeds },
    { label: "3 slaapkamers", field: "require_bedrooms_3", active: rules.requireBedrooms3 },
    { label: "Annuleerbaar", field: "require_cancelable", active: rules.requireCancelable },
    { label: "Transparante prijs", field: "require_transparent_price", active: rules.requireTransparentPrice },
    { label: "Zwembad", field: "require_pool", active: rules.requirePool },
    { label: "Airco", field: "require_airco", active: rules.requireAirco },
    { label: "Wifi", field: "require_wifi", active: rules.requireWifi },
    { label: "Parking", field: "require_parking", active: rules.requireParking },
    { label: "Terras", field: "require_terrace", active: rules.requireTerrace },
  ];

  const voteTopics: {
    label: string;
    options: { label: string; count: number }[];
  }[] = [
    {
      label: "Rondes",
      options: [
        { label: "2 rondes", count: countVal("preferred_rounds", 2) },
        { label: "3 rondes", count: countVal("preferred_rounds", 3) },
      ],
    },
    {
      label: "Vervoer",
      options: [
        { label: "Auto huren", count: countVal("mobility_choice", "car") },
        { label: "Taxi/transfer", count: countVal("mobility_choice", "transfers") },
        { label: "Neutraal", count: countVal("mobility_choice", "neutral") },
      ],
    },
    {
      label: "Locatie",
      options: [
        { label: "🏖️ Strand", count: countVal("base_choice", "beach") },
        { label: "⛳ Golf", count: countVal("base_choice", "golf") },
        { label: "Neutraal", count: countVal("base_choice", "neutral") },
      ],
    },
  ];

  // Golf reistijd
  const golfMinVotes: Record<number, number> = {};
  lockedSubs.forEach((s) => {
    golfMinVotes[s.max_golf_minutes] =
      (golfMinVotes[s.max_golf_minutes] || 0) + 1;
  });

  // Prioriteiten
  const avgPoints = {
    luxury: lockedSubs.reduce((s, sub) => s + sub.points_luxury, 0) / n,
    golfEase: lockedSubs.reduce((s, sub) => s + sub.points_golf_ease, 0) / n,
    beachLife: lockedSubs.reduce((s, sub) => s + sub.points_beach_life, 0) / n,
    lowHassle: lockedSubs.reduce((s, sub) => s + sub.points_low_hassle, 0) / n,
    exploring: lockedSubs.reduce((s, sub) => s + sub.points_exploring, 0) / n,
    budget: lockedSubs.reduce((s, sub) => s + sub.points_budget, 0) / n,
  };

  const priorityData = [
    { emoji: "✨", label: "Luxe", score: avgPoints.luxury },
    { emoji: "⛳", label: "Golf", score: avgPoints.golfEase },
    { emoji: "🏖️", label: "Strand", score: avgPoints.beachLife },
    { emoji: "🧘", label: "Gedoe ↓", score: avgPoints.lowHassle },
    { emoji: "🗺️", label: "Omgeving", score: avgPoints.exploring },
    { emoji: "💰", label: "Budget", score: avgPoints.budget },
  ].sort((a, b) => b.score - a.score);

  // Activiteiten
  const allActivities = lockedSubs.flatMap((s) => s.activities || []);
  const activityCounts: Record<string, number> = {};
  allActivities.forEach((a) => {
    activityCounts[a] = (activityCounts[a] || 0) + 1;
  });
  const sortedActivities = Object.entries(activityCounts).sort(
    ([, a], [, b]) => b - a
  );

  // Eetvoorkeuren
  const allDiet = lockedSubs.flatMap((s) => s.diet_preferences || []);
  const dietCounts: Record<string, number> = {};
  allDiet.forEach((d) => {
    dietCounts[d] = (dietCounts[d] || 0) + 1;
  });

  // Budget
  const budgets = lockedSubs
    .map((s) => s.budget_cap_total)
    .filter((b): b is number => b !== null && b > 0);

  const popularityLabel = (count: number) => {
    if (count >= n - 1) return "Populairste";
    if (count >= Math.ceil(n / 2)) return "Zeer populair";
    if (count >= 2) return "Populair";
    return "Niche";
  };

  return (
    <div className="space-y-6">
      {/* ── VEREISTEN + STEMVERDELING ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vereisten */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            ✅ Vereisten (meerderheid)
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Vereiste</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Status</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Vereist</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Niet</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => {
                  const counts = countBool(req.field);
                  return (
                    <tr key={req.field} className="border-t border-border/40">
                      <td className="px-3 py-2 font-medium">{req.label}</td>
                      <td className="text-center px-2 py-2">
                        {req.active ? (
                          <span className="inline-flex items-center gap-1 text-primary font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Vereist
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <XCircle className="h-3.5 w-3.5" /> Niet
                          </span>
                        )}
                      </td>
                      <td className="text-center px-2 py-2 font-bold tabular-nums">
                        {counts.yes}/{n}
                      </td>
                      <td className="text-center px-2 py-2 tabular-nums text-muted-foreground">
                        {counts.no}/{n}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stemverdeling */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            🗳️ Stemverdeling
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Onderwerp</th>
                  <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Optie</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Stemmen</th>
                </tr>
              </thead>
              <tbody>
                {voteTopics.map((topic) =>
                  topic.options.map((opt, i) => {
                    const isMajority = opt.count >= Math.ceil(n / 2);
                    return (
                      <tr
                        key={`${topic.label}-${opt.label}`}
                        className={`border-t border-border/40 ${isMajority ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-3 py-2 font-medium">
                          {i === 0 ? topic.label : ""}
                        </td>
                        <td className="px-2 py-2">{opt.label}</td>
                        <td className="text-center px-2 py-2 tabular-nums">
                          <span className={isMajority ? "font-bold text-primary" : ""}>
                            {opt.count}/{n}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
                {/* Golf reistijd */}
                {Object.entries(golfMinVotes)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([min, count], i) => {
                    const isMajority = count >= Math.ceil(n / 2);
                    return (
                      <tr
                        key={`golf-${min}`}
                        className={`border-t border-border/40 ${isMajority ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-3 py-2 font-medium">
                          {i === 0 ? "Golf reistijd" : ""}
                        </td>
                        <td className="px-2 py-2">≤ {min} min</td>
                        <td className="text-center px-2 py-2 tabular-nums">
                          <span className={isMajority ? "font-bold text-primary" : ""}>
                            {count}/{n}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PRIORITEITEN ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            📊 Prioriteiten — Gemiddelde punten (max 25)
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Prioriteit</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Score</th>
                  <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Relatief</th>
                </tr>
              </thead>
              <tbody>
                {priorityData.map((p) => {
                  const pct = Math.round((p.score / 25) * 100);
                  return (
                    <tr key={p.label} className="border-t border-border/40">
                      <td className="px-3 py-2 font-medium">
                        {p.emoji} {p.label}
                      </td>
                      <td className="text-center px-2 py-2 font-bold tabular-nums">
                        {p.score.toFixed(0)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground tabular-nums w-8 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* BUDGET */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
              💰 Budget
            </p>
            <div className="border rounded-lg p-4">
              {budgets.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="font-display font-extrabold text-lg">
                      €{Math.min(...budgets)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Laagste
                    </p>
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-lg">
                      €{budgets.sort((a, b) => a - b)[Math.floor(budgets.length / 2)]}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Mediaan
                    </p>
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-lg">
                      €{Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Gemiddeld
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Geen budget cap opgegeven
                </p>
              )}
            </div>
          </div>

          {/* Golf reistijd constraint */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
              ⛳ Golf reistijd constraint
            </p>
            <div className="border rounded-lg p-4 space-y-2">
              {Object.entries(golfMinVotes)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([min, count]) => {
                  const isMajority = count >= Math.ceil(n / 2);
                  return (
                    <div key={min} className="flex items-center justify-between text-sm">
                      <span>≤ {min} minuten</span>
                      <div className="flex items-center gap-2">
                        <span className={`tabular-nums ${isMajority ? "font-bold text-primary" : "text-muted-foreground"}`}>
                          {count} / {n}
                        </span>
                        {isMajority && (
                          <Badge variant="default" className="text-[9px]">
                            ✓ Vastgesteld
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVITEITEN + EETVOORKEUREN ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            🏄 Activiteiten naast golf
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Activiteit</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Stemmen</th>
                  <th className="text-left px-2 py-2 font-semibold text-muted-foreground">Populariteit</th>
                </tr>
              </thead>
              <tbody>
                {sortedActivities.map(([act, count]) => (
                  <tr key={act} className="border-t border-border/40">
                    <td className="px-3 py-2 font-medium">{act}</td>
                    <td className="text-center px-2 py-2 font-bold tabular-nums">
                      {count}×
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {popularityLabel(count)}
                    </td>
                  </tr>
                ))}
                {sortedActivities.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-muted-foreground italic text-center">
                      Geen activiteiten opgegeven
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            🍽️ Eetvoorkeuren
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Voorkeur</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Stemmen</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Aandeel</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dietCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([diet, count]) => (
                    <tr key={diet} className="border-t border-border/40">
                      <td className="px-3 py-2 font-medium">{diet}</td>
                      <td className="text-center px-2 py-2 font-bold tabular-nums">
                        {count}×
                      </td>
                      <td className="text-center px-2 py-2 tabular-nums text-muted-foreground">
                        {Math.round((count / n) * 100)}%
                      </td>
                    </tr>
                  ))}
                {Object.keys(dietCounts).length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-muted-foreground italic text-center">
                      Geen voorkeuren
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PER PERSOON DETAIL ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          👥 Per persoon
        </p>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground sticky left-0 bg-secondary">
                  Naam
                </th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Vervoer</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Locatie</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Golf max</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Rondes</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Budget</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Top prioriteit</th>
              </tr>
            </thead>
            <tbody>
              {lockedSubs.map((sub) => {
                const points = [
                  { label: "Luxe", val: sub.points_luxury },
                  { label: "Golf", val: sub.points_golf_ease },
                  { label: "Strand", val: sub.points_beach_life },
                  { label: "Gedoe↓", val: sub.points_low_hassle },
                  { label: "Omgeving", val: sub.points_exploring },
                  { label: "Budget", val: sub.points_budget },
                ].sort((a, b) => b.val - a.val);

                return (
                  <tr key={sub.id} className="border-t border-border/40">
                    <td className="px-3 py-2.5 font-semibold sticky left-0 bg-background">
                      {getName(sub.user_id)}
                    </td>
                    <td className="text-center px-2 py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {sub.mobility_choice === "car" ? "Auto" : sub.mobility_choice === "transfers" ? "Taxi" : "Neutraal"}
                      </Badge>
                    </td>
                    <td className="text-center px-2 py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {sub.base_choice === "golf" ? "⛳ Golf" : sub.base_choice === "beach" ? "🏖️ Strand" : "Neutraal"}
                      </Badge>
                    </td>
                    <td className="text-center px-2 py-2.5 tabular-nums">
                      {sub.max_golf_minutes} min
                    </td>
                    <td className="text-center px-2 py-2.5 tabular-nums font-bold">
                      {sub.preferred_rounds}
                    </td>
                    <td className="text-center px-2 py-2.5 tabular-nums">
                      {sub.budget_cap_total ? `€${sub.budget_cap_total}` : "—"}
                    </td>
                    <td className="text-center px-2 py-2.5">
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        {points[0].label} ({points[0].val})
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        * Besluit op basis van eenvoudige meerderheid (≥{Math.ceil(n / 2)}/{n}). Bij gelijke stemmen geldt de vereiste als 'aanwezig maar niet doorslaggevend'.
      </p>
    </div>
  );
}
