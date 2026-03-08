import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { computeGroupRules, computeAvgPoints, type Submission } from "@/lib/scoring";
import { DIET_LABELS, ACTIVITY_LABELS, translateLabel } from "@/lib/labelMaps";
import {
  CheckCircle2, XCircle, Users, Bed, Bath, Car, UtensilsCrossed,
  Dumbbell, Star, Waves, Wind, Wifi, ParkingCircle, MapPin, DollarSign,
  BarChart3, Palmtree, Mountain, Sparkles, Zap
} from "lucide-react";
import { HeroSkeleton, CardSkeleton } from "@/components/PageSkeleton";

interface Profile { id: string; username: string; display_name: string; }

const PRIORITY_LABELS: Record<string, string> = {
  golfEase: "Golf gemak",
  beachLife: "Strandleven",
  exploring: "Omgeving verkennen",
  luxury: "Comfort & luxe",
  budget: "Budget",
  lowHassle: "Minimaal gedoe",
};

const PRIORITY_ICONS: Record<string, typeof Star> = {
  golfEase: Dumbbell,
  beachLife: Waves,
  exploring: Mountain,
  luxury: Sparkles,
  budget: DollarSign,
  lowHassle: Zap,
};

const MOBILITY_LABELS: Record<string, string> = {
  car: "Auto huren",
  taxi: "Taxi / OV",
  neutral: "Geen voorkeur",
};

const BASE_LABELS: Record<string, string> = {
  central: "Centraal (stad/strand)",
  golf: "Bij de golfbaan",
  neutral: "Geen voorkeur",
};

const REQUIREMENT_LABELS: Record<string, string> = {
  require_fixed_beds: "Vaste bedden (min. 6)",
  require_bedrooms_3: "Minimaal 3 slaapkamers",
  require_cancelable: "Gratis annulering",
  require_transparent_price: "Transparante prijs",
  require_pool: "Zwembad",
  require_airco: "Airco",
  require_wifi: "Wifi",
  require_parking: "Parkeerplaats",
  require_terrace: "Terras",
};

export default function Wensen() {
  const { user } = useAuth();
  const { activeTrip } = useTrip();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const tripId = activeTrip?.id;

  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      supabase.from("submissions").select("*").eq("trip_id", tripId),
      supabase.from("profiles").select("*"),
    ]).then(([s, p]) => {
      setSubmissions((s.data as any[]) || []);
      setProfiles((p.data as any[]) || []);
      setLoading(false);
    });
  }, [tripId]);

  if (loading) {
    return (
      <AppLayout>
        <div>
          <HeroSkeleton />
          <div className="px-6 py-6 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </AppLayout>
    );
  }

  const rules = computeGroupRules(submissions);
  const avgPoints = computeAvgPoints(submissions);
  const n = submissions.length;

  // Count votes per requirement
  const reqCounts: Record<string, number> = {};
  const reqKeys = Object.keys(REQUIREMENT_LABELS) as (keyof Submission)[];
  reqKeys.forEach(key => {
    reqCounts[key] = submissions.filter(s => s[key] === true).length;
  });

  // Mobility votes
  const mobilityCounts: Record<string, number> = {};
  submissions.forEach(s => { mobilityCounts[s.mobility_choice] = (mobilityCounts[s.mobility_choice] || 0) + 1; });

  // Base choice votes
  const baseCounts: Record<string, number> = {};
  submissions.forEach(s => { baseCounts[s.base_choice] = (baseCounts[s.base_choice] || 0) + 1; });

  // Golf rounds
  const roundCounts: Record<number, number> = {};
  submissions.forEach(s => { roundCounts[s.preferred_rounds] = (roundCounts[s.preferred_rounds] || 0) + 1; });

  // Max golf minutes
  const golfMinCounts: Record<number, number> = {};
  submissions.forEach(s => { golfMinCounts[s.max_golf_minutes] = (golfMinCounts[s.max_golf_minutes] || 0) + 1; });

  // Diet
  const allDiets: Record<string, number> = {};
  submissions.forEach(s => {
    (s.diet_preferences || []).forEach(d => { allDiets[d] = (allDiets[d] || 0) + 1; });
  });

  // Activities
  const allActivities: Record<string, number> = {};
  submissions.forEach(s => {
    (s.activities || []).forEach(a => { allActivities[a] = (allActivities[a] || 0) + 1; });
  });

  // Budget caps
  const budgets = submissions.map(s => s.budget_cap_total).filter((b): b is number => b !== null && b > 0 && b < 100000);

  // Remarks
  const allRemarks = submissions
    .map(s => {
      const p = profiles.find(pr => pr.id === s.user_id);
      return { name: p?.display_name || "?", remarks_a: s.remarks_a, remarks_b: s.remarks_b };
    })
    .filter(r => r.remarks_a || r.remarks_b);

  // Sorted priorities
  const sortedPriorities = Object.entries(avgPoints)
    .sort(([, a], [, b]) => b - a)
    .map(([key, val]) => ({ key, label: PRIORITY_LABELS[key] || key, value: val }));

  const majority = Math.ceil(n / 2);

  return (
    <AppLayout>
      <div>
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">Overzicht</p>
          <h1 className="font-display text-2xl font-extrabold">Wensen & voorwaarden</h1>
          <p className="text-white/60 text-sm mt-1">
            Samenvatting van {n} ingevulde intake{n !== 1 ? "s" : ""}
          </p>
        </section>

        <section className="px-6 py-6 pb-24 space-y-4">

          {/* Groepsbesluit: Voorwaarden */}
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="font-display font-bold text-sm">Groepsvoorwaarden (meerderheid)</p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Voorwaarden die door de meerderheid ({majority}+ van {n}) zijn aangevinkt gelden als groepsregel.
              </p>
              <div className="space-y-2">
                {reqKeys.map(key => {
                  const count = reqCounts[key];
                  const accepted = count >= majority;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {accepted ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                        <span className={`text-xs ${accepted ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                          {REQUIREMENT_LABELS[key]}
                        </span>
                      </div>
                      <Badge variant={accepted ? "default" : "outline"} className="text-[10px] tabular-nums">
                        {count}/{n}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Prioriteiten */}
          <Card className="border-border/60">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-primary" />
                <p className="font-display font-bold text-sm">Groepsprioriteiten (gemiddeld)</p>
              </div>
              <div className="space-y-2.5">
                {sortedPriorities.map(p => {
                  const Icon = PRIORITY_ICONS[p.key] || Star;
                  const maxVal = Math.max(...sortedPriorities.map(pp => pp.value), 1);
                  return (
                    <div key={p.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium">{p.label}</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{p.value.toFixed(1)} pts</span>
                      </div>
                      <Progress value={(p.value / maxVal) * 100} className="h-1.5 rounded-full" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Accordion type="multiple" className="space-y-3">
            {/* Vervoer */}
            <AccordionItem value="vervoer" className="border rounded-lg border-border/60">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Vervoer</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Vervoerskeuze</p>
                  {Object.entries(MOBILITY_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-xs">{label}</span>
                      <Badge variant="outline" className="text-[10px] tabular-nums">{mobilityCounts[key] || 0}x</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Locatie */}
            <AccordionItem value="locatie" className="border rounded-lg border-border/60">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Locatie voorkeur</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Uitvalsbasis</p>
                  {Object.entries(BASE_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-xs">{label}</span>
                      <Badge variant="outline" className="text-[10px] tabular-nums">{baseCounts[key] || 0}x</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Golf */}
            <AccordionItem value="golf" className="border rounded-lg border-border/60">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Golf</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Gewenste rondes</p>
                  {Object.entries(roundCounts).sort(([a], [b]) => Number(a) - Number(b)).map(([rounds, count]) => (
                    <div key={rounds} className="flex items-center justify-between py-1">
                      <span className="text-xs">{rounds} rondes</span>
                      <Badge variant="outline" className="text-[10px] tabular-nums">{count}x</Badge>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Max. reistijd naar golfbaan</p>
                  {Object.entries(golfMinCounts).sort(([a], [b]) => Number(a) - Number(b)).map(([min, count]) => (
                    <div key={min} className="flex items-center justify-between py-1">
                      <span className="text-xs">{min} minuten</span>
                      <Badge variant="outline" className="text-[10px] tabular-nums">{count}x</Badge>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-1">Groepsgrens (mediaan): {rules.maxGolfMinutes} min</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Budget */}
            <AccordionItem value="budget" className="border rounded-lg border-border/60">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Budget</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-2">
                {budgets.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Laagste budget</span>
                      <span className="text-xs font-semibold tabular-nums">€{Math.min(...budgets)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Hoogste budget</span>
                      <span className="text-xs font-semibold tabular-nums">€{Math.max(...budgets)}</span>
                    </div>
                    {rules.budgetCap && (
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-xs font-medium">Groepsplafond</span>
                        <Badge className="text-[10px] tabular-nums">€{rules.budgetCap}</Badge>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Geen budgetlimieten opgegeven</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Dieet */}
            <AccordionItem value="dieet" className="border rounded-lg border-border/60">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Dieet & allergieën</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-2">
                {Object.keys(allDiets).length > 0 ? (
                  Object.entries(allDiets).sort(([, a], [, b]) => b - a).map(([diet, count]) => (
                    <div key={diet} className="flex items-center justify-between py-1">
                      <span className="text-xs">{translateLabel(DIET_LABELS, diet)}</span>
                      <Badge variant="outline" className="text-[10px] tabular-nums">{count}x</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Geen dieetvoorkeuren opgegeven</p>
                )}
                {submissions.some(s => s.diet_remarks) && (
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Opmerkingen</p>
                    {submissions.filter(s => s.diet_remarks).map(s => {
                      const p = profiles.find(pr => pr.id === s.user_id);
                      return (
                        <p key={s.id} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{p?.display_name}:</span> {s.diet_remarks}
                        </p>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Activiteiten */}
            <AccordionItem value="activiteiten" className="border rounded-lg border-border/60">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Palmtree className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Activiteiten</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-2">
                {Object.keys(allActivities).length > 0 ? (
                  Object.entries(allActivities).sort(([, a], [, b]) => b - a).map(([act, count]) => (
                    <div key={act} className="flex items-center justify-between py-1">
                      <span className="text-xs">{act}</span>
                      <Badge variant="outline" className="text-[10px] tabular-nums">{count}x</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Geen activiteiten opgegeven</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Opmerkingen */}
            {allRemarks.length > 0 && (
              <AccordionItem value="opmerkingen" className="border rounded-lg border-border/60">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-display font-bold text-sm">Opmerkingen</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-3">
                  {allRemarks.map((r, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-xs font-semibold">{r.name}</p>
                      {r.remarks_a && <p className="text-xs text-muted-foreground">{r.remarks_a}</p>}
                      {r.remarks_b && <p className="text-xs text-muted-foreground">{r.remarks_b}</p>}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </section>
      </div>
    </AppLayout>
  );
}
