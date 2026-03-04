import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { computeGroupRules, computeAvgPoints, type Submission } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Car, Home, UtensilsCrossed, Dumbbell, BarChart3, Users, CheckCircle2, XCircle } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  display_name: string;
}

export default function Uitslag() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("submissions").select("*"),
      supabase.from("profiles").select("*"),
    ]).then(([s, p]) => {
      setSubmissions((s.data as any[]) || []);
      setProfiles((p.data as any[]) || []);
      setLoading(false);
    });
  }, []);

  const lockedSubs = useMemo(() => submissions.filter(s => s.locked), [submissions]);
  const rules = useMemo(() => computeGroupRules(lockedSubs), [lockedSubs]);
  const avgPoints = useMemo(() => lockedSubs.length > 0 ? computeAvgPoints(lockedSubs) : null, [lockedSubs]);
  const getName = (userId: string) => profiles.find(p => p.id === userId)?.display_name || "?";

  // Aggregate helpers
  const countVotes = (field: keyof Submission, value: any) => lockedSubs.filter(s => s[field] === value).length;
  const mobilityWinner = (() => {
    const car = countVotes("mobility_choice", "car");
    const taxi = countVotes("mobility_choice", "transfers");
    const neutral = countVotes("mobility_choice", "neutral");
    if (car > taxi && car > neutral) return { label: "Huurauto", icon: "🚗" };
    if (taxi > car && taxi > neutral) return { label: "Taxi / transfers", icon: "🚕" };
    return { label: "Geen voorkeur", icon: "🤷" };
  })();

  const allDietPrefs = lockedSubs.flatMap(s => s.diet_preferences || []);
  const dietCounts: Record<string, number> = {};
  allDietPrefs.forEach(d => { dietCounts[d] = (dietCounts[d] || 0) + 1; });

  const allDietRemarks = lockedSubs
    .filter(s => s.diet_remarks)
    .map(s => ({ user: getName(s.user_id), text: s.diet_remarks! }));

  const allActivities = lockedSubs.flatMap(s => s.activities || []);
  const activityCounts: Record<string, number> = {};
  allActivities.forEach(a => { activityCounts[a] = (activityCounts[a] || 0) + 1; });

  const allRemarks = lockedSubs
    .filter(s => s.remarks_a || s.remarks_b)
    .map(s => ({ user: getName(s.user_id), text: [s.remarks_a, s.remarks_b].filter(Boolean).join(" | ") }));

  const budgets = lockedSubs.map(s => s.budget_cap_total).filter((b): b is number => b !== null && b > 0);
  const budgetMedian = budgets.length > 0 ? budgets.sort((a, b) => a - b)[Math.floor(budgets.length / 2)] : null;

  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;

  if (lockedSubs.length === 0) {
    return (
      <AppLayout>
        <div className="px-4 py-16 text-center space-y-3">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <h2 className="font-display text-xl font-extrabold">Nog geen resultaten</h2>
          <p className="text-muted-foreground text-sm">De intake is nog niet afgerond door de deelnemers.</p>
        </div>
      </AppLayout>
    );
  }

  const mustHaves = [
    { label: "Vaste bedden (6+)", active: rules.requireFixedBeds },
    { label: "3+ slaapkamers", active: rules.requireBedrooms3 },
    { label: "Zwembad", active: rules.requirePool },
    { label: "Airconditioning", active: rules.requireAirco },
    { label: "Wifi", active: rules.requireWifi },
    { label: "Parkeerplaats", active: rules.requireParking },
    { label: "Terras / buitenruimte", active: rules.requireTerrace },
    { label: "Transparante prijs", active: rules.requireTransparentPrice },
    { label: "Gratis annuleerbaar", active: rules.requireCancelable },
  ];

  const pointsData = avgPoints ? [
    { label: "Golf gemak", value: avgPoints.golfEase, emoji: "⛳" },
    { label: "Strandleven", value: avgPoints.beachLife, emoji: "🏖️" },
    { label: "Omgeving verkennen", value: avgPoints.exploring, emoji: "🗺️" },
    { label: "Luxe & comfort", value: avgPoints.luxury, emoji: "✨" },
    { label: "Budget bewust", value: avgPoints.budget, emoji: "💰" },
    { label: "Minimaal gedoe", value: avgPoints.lowHassle, emoji: "🧘" },
  ].sort((a, b) => b.value - a.value) : [];

  return (
    <AppLayout>
      <div className="-mx-4 -mt-6">
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">Gezamenlijke uitslag</p>
          <h1 className="font-display text-2xl font-extrabold">
            Wat wij willen
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Op basis van {lockedSubs.length} ingevulde intakes
          </p>
        </section>

        {/* ═══════════ VERVOER ═══════════ */}
        <ResultSection icon={<Car className="h-4 w-4" />} title="Vervoer" number={1}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{mobilityWinner.icon}</span>
            <div>
              <p className="font-display font-extrabold text-lg">{mobilityWinner.label}</p>
              <p className="text-xs text-muted-foreground">Meerderheidsuitslag</p>
            </div>
          </div>
          <VoteBar
            items={[
              { label: "Huurauto", count: countVotes("mobility_choice", "car") },
              { label: "Taxi", count: countVotes("mobility_choice", "transfers") },
              { label: "Neutraal", count: countVotes("mobility_choice", "neutral") },
            ]}
            total={lockedSubs.length}
          />
        </ResultSection>

        {/* ═══════════ ACCOMMODATIE ═══════════ */}
        <ResultSection icon={<Home className="h-4 w-4" />} title="Accommodatie eisen" number={2}>
          {/* Must-haves */}
          <div className="space-y-2 mb-6">
            {mustHaves.map(mh => (
              <div key={mh.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm">{mh.label}</span>
                {mh.active ? (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <CheckCircle2 className="h-4 w-4" /> Vereist
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <XCircle className="h-4 w-4" /> Niet vereist
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Extra regels */}
          <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max reistijd golf</span>
              <span className="font-display font-bold">{rules.maxGolfMinutes} min</span>
            </div>
            {budgetMedian && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget plafond (mediaan)</span>
                <span className="font-display font-bold">€{budgetMedian}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locatievoorkeur</span>
              <span className="font-display font-bold">
                {countVotes("base_choice", "golf") > countVotes("base_choice", "beach") ? "Bij golfbaan" :
                 countVotes("base_choice", "beach") > countVotes("base_choice", "golf") ? "Bij strand" : "Neutraal"}
              </span>
            </div>
          </div>

          {/* Locatie stemming */}
          <div className="mt-4">
            <VoteBar
              items={[
                { label: "Golf", count: countVotes("base_choice", "golf") },
                { label: "Strand", count: countVotes("base_choice", "beach") },
                { label: "Neutraal", count: countVotes("base_choice", "neutral") },
              ]}
              total={lockedSubs.length}
            />
          </div>
        </ResultSection>

        {/* ═══════════ PRIORITEITEN ═══════════ */}
        <ResultSection icon={<BarChart3 className="h-4 w-4" />} title="Prioriteiten" number={3}>
          <p className="text-sm text-muted-foreground mb-4">Gemiddelde puntenverdeling van de groep</p>
          <div className="space-y-3">
            {pointsData.map((p, i) => (
              <div key={p.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm flex items-center gap-2">
                    <span>{p.emoji}</span> {p.label}
                    {i === 0 && <Badge className="text-[9px] ml-1">Hoogste</Badge>}
                  </span>
                  <span className="font-display font-bold text-sm tabular-nums">{p.value.toFixed(0)}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(p.value * 2.5, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ResultSection>

        {/* ═══════════ ETEN ═══════════ */}
        <ResultSection icon={<UtensilsCrossed className="h-4 w-4" />} title="Eten & drinken" number={4}>
          {Object.keys(dietCounts).length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Eetvoorkeuren binnen de groep</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dietCounts).sort(([, a], [, b]) => b - a).map(([diet, count]) => (
                  <Badge key={diet} variant="secondary" className="text-xs py-1 px-3">
                    {diet} <span className="font-bold ml-1.5">{count}×</span>
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Geen specifieke eetvoorkeuren opgegeven</p>
          )}
          {allDietRemarks.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opmerkingen over eten</p>
              {allDietRemarks.map((r, i) => (
                <div key={i} className="bg-secondary rounded-lg p-3 text-sm">
                  <span className="font-semibold">{r.user}:</span>{" "}
                  <span className="text-muted-foreground italic">{r.text}</span>
                </div>
              ))}
            </div>
          )}
        </ResultSection>

        {/* ═══════════ ACTIVITEITEN ═══════════ */}
        <ResultSection icon={<Dumbbell className="h-4 w-4" />} title="Activiteiten" number={5}>
          {Object.keys(activityCounts).length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Wat willen we doen naast golf?</p>
              <div className="space-y-2">
                {Object.entries(activityCounts).sort(([, a], [, b]) => b - a).map(([act, count]) => (
                  <div key={act} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm">{act}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-secondary rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${(count / lockedSubs.length) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-muted-foreground">{count}/{lockedSubs.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Geen activiteiten opgegeven</p>
          )}
        </ResultSection>

        {/* ═══════════ OPMERKINGEN ═══════════ */}
        {allRemarks.length > 0 && (
          <section className="px-6 py-8 border-t">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">💬 Opmerkingen van deelnemers</p>
            <div className="space-y-2">
              {allRemarks.map((r, i) => (
                <div key={i} className="bg-secondary rounded-lg p-3 text-sm">
                  <span className="font-semibold">{r.user}:</span>{" "}
                  <span className="text-muted-foreground italic">{r.text}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <section className="bg-foreground px-6 py-8 text-center">
          <p className="text-white/40 text-xs">
            Resultaten op basis van {lockedSubs.length} van 6 intakes
          </p>
        </section>
      </div>
    </AppLayout>
  );
}

function ResultSection({ icon, title, number, children }: { icon: React.ReactNode; title: string; number: number; children: React.ReactNode }) {
  return (
    <section className="px-6 py-8 border-t">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display font-extrabold text-sm">
          {number}
        </div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-lg font-extrabold">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function VoteBar({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  return (
    <div className="flex gap-2">
      {items.map(item => {
        const pct = total > 0 ? (item.count / total) * 100 : 0;
        const isMajority = item.count >= Math.ceil(total / 2);
        return (
          <div
            key={item.label}
            className={`flex-1 text-center rounded-lg py-3 text-xs font-medium transition-colors ${
              isMajority ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground"
            }`}
          >
            <p className="font-display font-extrabold text-lg">{item.count}</p>
            <p className="mt-0.5">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}
