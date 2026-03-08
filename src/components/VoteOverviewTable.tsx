import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Submission, GroupRules } from "@/lib/scoring";
import { getTripConfig, type TripConfig } from "@/lib/tripConfig";
import { DIET_LABELS, ACTIVITY_LABELS, translateLabel } from "@/lib/labelMaps";

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

interface Props {
  submissions: Submission[];
  rules: GroupRules;
  profiles: Profile[];
  tripType?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────
const getField = (sub: Submission, field: string): any => (sub as any)[field];

function countBool(subs: Submission[], field: string) {
  return {
    yes: subs.filter((s) => getField(s, field) === true).length,
    no: subs.filter((s) => getField(s, field) === false).length,
  };
}

function countVal(subs: Submission[], field: string, value: any) {
  const compare = typeof value === "number" ? value : String(value);
  return subs.filter((s) => {
    const v = getField(s, field);
    return typeof compare === "number" ? v === compare : String(v) === compare;
  }).length;
}

// ─── Sub-components ─────────────────────────────────────────────────

function RequirementsSection({ subs, config, rules, n }: { subs: Submission[]; config: TripConfig; rules: GroupRules; n: number }) {
  // Map rules to a lookup by key
  const rulesMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    // Build from GroupRules fields
    for (const req of config.requirements) {
      const camelKey = req.submissionField.replace("require_", "require").replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      map[req.key] = (rules as any)[camelKey] ?? false;
    }
    return map;
  }, [config, rules]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        Vereisten (meerderheid)
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
            {config.requirements.map((req) => {
              const counts = countBool(subs, req.submissionField);
              const active = rulesMap[req.key];
              return (
                <tr key={req.key} className="border-t border-border/40">
                  <td className="px-3 py-2 font-medium">{req.label}</td>
                  <td className="text-center px-2 py-2">
                    {active ? (
                      <span className="inline-flex items-center gap-1 text-primary font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Vereist
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" /> Niet
                      </span>
                    )}
                  </td>
                  <td className="text-center px-2 py-2 font-bold tabular-nums">{counts.yes}/{n}</td>
                  <td className="text-center px-2 py-2 tabular-nums text-muted-foreground">{counts.no}/{n}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VoteDistribution({ subs, config, n }: { subs: Submission[]; config: TripConfig; n: number }) {
  // Travel time votes
  const travelTimeVotes: Record<number, number> = {};
  if (config.travelTime) {
    subs.forEach((s) => {
      const val = getField(s, config.travelTime!.submissionField);
      travelTimeVotes[val] = (travelTimeVotes[val] || 0) + 1;
    });
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        Stemverdeling
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
            {config.voteTopics.map((topic) =>
              topic.options.map((opt, i) => {
                const count = countVal(subs, topic.submissionField, isNaN(Number(opt.value)) ? opt.value : Number(opt.value));
                const isMajority = count >= Math.ceil(n / 2);
                return (
                  <tr key={`${topic.key}-${opt.value}`} className={`border-t border-border/40 ${isMajority ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2 font-medium">{i === 0 ? topic.label : ""}</td>
                    <td className="px-2 py-2">{opt.label}</td>
                    <td className="text-center px-2 py-2 tabular-nums">
                      <span className={isMajority ? "font-bold text-primary" : ""}>{count}/{n}</span>
                    </td>
                  </tr>
                );
              })
            )}
            {/* Travel time rows */}
            {config.travelTime &&
              Object.entries(travelTimeVotes)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([min, count], i) => {
                  const isMajority = count >= Math.ceil(n / 2);
                  return (
                    <tr key={`tt-${min}`} className={`border-t border-border/40 ${isMajority ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-2 font-medium">{i === 0 ? config.travelTime!.label : ""}</td>
                      <td className="px-2 py-2">≤ {min} {config.travelTime!.unit}</td>
                      <td className="text-center px-2 py-2 tabular-nums">
                        <span className={isMajority ? "font-bold text-primary" : ""}>{count}/{n}</span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrioritiesSection({ subs, config, n }: { subs: Submission[]; config: TripConfig; n: number }) {
  const priorityData = useMemo(() => {
    return config.priorities
      .map((p) => {
        const avg = subs.reduce((sum, sub) => sum + (getField(sub, p.submissionField) || 0), 0) / n;
        return { ...p, score: avg };
      })
      .sort((a, b) => b.score - a.score);
  }, [subs, config, n]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        Prioriteiten — Gemiddelde punten (max {config.priorities[0]?.maxPoints ?? 25})
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
              const pct = Math.round((p.score / p.maxPoints) * 100);
              return (
                <tr key={p.key} className="border-t border-border/40">
                  <td className="px-3 py-2 font-medium">{p.label}</td>
                  <td className="text-center px-2 py-2 font-bold tabular-nums">{p.score.toFixed(0)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetSection({ subs, n }: { subs: Submission[]; n: number }) {
  const budgets = subs.map((s) => s.budget_cap_total).filter((b): b is number => b !== null && b > 0);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">Budget</p>
      <div className="border rounded-lg p-4">
        {budgets.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display font-extrabold text-lg">€{Math.min(...budgets)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Laagste</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-lg">€{budgets.sort((a, b) => a - b)[Math.floor(budgets.length / 2)]}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mediaan</p>
            </div>
            <div>
              <p className="font-display font-extrabold text-lg">€{Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gemiddeld</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">Geen budget cap opgegeven</p>
        )}
      </div>
    </div>
  );
}

function TravelTimeConstraint({ subs, config, n }: { subs: Submission[]; config: TripConfig; n: number }) {
  if (!config.travelTime) return null;
  const votes: Record<number, number> = {};
  subs.forEach((s) => {
    const val = getField(s, config.travelTime!.submissionField);
    votes[val] = (votes[val] || 0) + 1;
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        {config.travelTime.label}
      </p>
      <div className="border rounded-lg p-4 space-y-2">
        {Object.entries(votes)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([min, count]) => {
            const isMajority = count >= Math.ceil(n / 2);
            return (
              <div key={min} className="flex items-center justify-between text-sm">
                <span>≤ {min} {config.travelTime!.unit}uten</span>
                <div className="flex items-center gap-2">
                  <span className={`tabular-nums ${isMajority ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {count} / {n}
                  </span>
                  {isMajority && <Badge variant="default" className="text-[9px]">✓ Vastgesteld</Badge>}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function ActivitiesSection({ subs, n }: { subs: Submission[]; n: number }) {
  const allActivities = subs.flatMap((s) => s.activities || []);
  const counts: Record<string, number> = {};
  allActivities.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);

  const popularityLabel = (count: number) => {
    if (count >= n - 1) return "Populairste";
    if (count >= Math.ceil(n / 2)) return "Zeer populair";
    if (count >= 2) return "Populair";
    return "Niche";
  };

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">Activiteiten</p>
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
            {sorted.map(([act, count]) => (
              <tr key={act} className="border-t border-border/40">
                <td className="px-3 py-2 font-medium">{translateLabel(ACTIVITY_LABELS, act)}</td>
                <td className="text-center px-2 py-2 font-bold tabular-nums">{count}×</td>
                <td className="px-2 py-2 text-muted-foreground">{popularityLabel(count)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-3 text-muted-foreground italic text-center">Geen activiteiten opgegeven</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DietSection({ subs, n }: { subs: Submission[]; n: number }) {
  const allDiet = subs.flatMap((s) => s.diet_preferences || []);
  const counts: Record<string, number> = {};
  allDiet.forEach((d) => { counts[d] = (counts[d] || 0) + 1; });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">Eetvoorkeuren</p>
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
            {Object.entries(counts).sort(([, a], [, b]) => b - a).map(([diet, count]) => (
              <tr key={diet} className="border-t border-border/40">
                <td className="px-3 py-2 font-medium">{diet}</td>
                <td className="text-center px-2 py-2 font-bold tabular-nums">{count}×</td>
                <td className="text-center px-2 py-2 tabular-nums text-muted-foreground">{Math.round((count / n) * 100)}%</td>
              </tr>
            ))}
            {Object.keys(counts).length === 0 && (
              <tr><td colSpan={3} className="px-3 py-3 text-muted-foreground italic text-center">Geen voorkeuren</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerPersonSection({ subs, config, profiles }: { subs: Submission[]; config: TripConfig; profiles: Profile[] }) {
  const getName = (userId: string) => profiles.find((p) => p.id === userId)?.display_name || "?";

  // Build mobility and base label maps from config
  const mobilityTopic = config.voteTopics.find((t) => t.key === "mobility");
  const baseTopic = config.voteTopics.find((t) => t.key === "base");
  const labelMap = (topic: typeof mobilityTopic, val: string) =>
    topic?.options.find((o) => o.value === val)?.label ?? val;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">👥 Per persoon</p>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left px-3 py-2 font-semibold text-muted-foreground sticky left-0 bg-secondary">Naam</th>
              {mobilityTopic && <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Vervoer</th>}
              {baseTopic && <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Locatie</th>}
              {config.travelTime && <th className="text-center px-2 py-2 font-semibold text-muted-foreground">{config.travelTime.label} max</th>}
              {config.roundsField && <th className="text-center px-2 py-2 font-semibold text-muted-foreground">{config.roundsField.label}</th>}
              <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Budget</th>
              <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Top prioriteit</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((sub) => {
              const points = config.priorities
                .map((p) => ({ label: p.label, val: getField(sub, p.submissionField) || 0 }))
                .sort((a, b) => b.val - a.val);

              return (
                <tr key={sub.id} className="border-t border-border/40">
                  <td className="px-3 py-2.5 font-semibold sticky left-0 bg-background">{getName(sub.user_id)}</td>
                  {mobilityTopic && (
                    <td className="text-center px-2 py-2.5">
                      <Badge variant="outline" className="text-[10px]">{labelMap(mobilityTopic, sub.mobility_choice)}</Badge>
                    </td>
                  )}
                  {baseTopic && (
                    <td className="text-center px-2 py-2.5">
                      <Badge variant="outline" className="text-[10px]">{labelMap(baseTopic, sub.base_choice)}</Badge>
                    </td>
                  )}
                  {config.travelTime && (
                    <td className="text-center px-2 py-2.5 tabular-nums">
                      {getField(sub, config.travelTime.submissionField)} {config.travelTime.unit}
                    </td>
                  )}
                  {config.roundsField && (
                    <td className="text-center px-2 py-2.5 tabular-nums font-bold">
                      {getField(sub, config.roundsField.submissionField)}
                    </td>
                  )}
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
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export function VoteOverviewTable({ submissions, rules, profiles, tripType }: Props) {
  const config = useMemo(() => getTripConfig(tripType), [tripType]);

  const lockedSubs = useMemo(() => submissions.filter((s) => s.locked), [submissions]);
  const n = lockedSubs.length;

  if (n === 0) return null;

  return (
    <div className="space-y-6">
      {/* Vereisten + Stemverdeling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RequirementsSection subs={lockedSubs} config={config} rules={rules} n={n} />
        <VoteDistribution subs={lockedSubs} config={config} n={n} />
      </div>

      {/* Prioriteiten + Budget/TravelTime */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PrioritiesSection subs={lockedSubs} config={config} n={n} />
        <div className="space-y-6">
          <BudgetSection subs={lockedSubs} n={n} />
          <TravelTimeConstraint subs={lockedSubs} config={config} n={n} />
        </div>
      </div>

      {/* Activiteiten + Eetvoorkeuren */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ActivitiesSection subs={lockedSubs} n={n} />
        <DietSection subs={lockedSubs} n={n} />
      </div>

      {/* Per persoon */}
      <PerPersonSection subs={lockedSubs} config={config} profiles={profiles} />

      <p className="text-[10px] text-muted-foreground text-center">
        * Besluit op basis van eenvoudige meerderheid (≥{Math.ceil(n / 2)}/{n}).
      </p>
    </div>
  );
}
