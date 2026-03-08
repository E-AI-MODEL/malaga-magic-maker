import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { computeGroupRules, computeAvgPoints, type Submission } from "@/lib/scoring";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Car, CarTaxiFront, Minus, Home, UtensilsCrossed, Dumbbell, BarChart3, Users, CheckCircle2, XCircle, Star, ExternalLink, Bed, Bath, Waves, ParkingCircle, Wind, Wifi, MapPin, Map, Flag, Umbrella, Compass, Gem, Wallet, Heart } from "lucide-react";
import { DIET_LABELS, ACTIVITY_LABELS, translateLabel } from "@/lib/labelMaps";
import { POIMatrix } from "@/components/POIMatrix";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { ReactionBar } from "@/components/ReactionBar";
import { SectionComments } from "@/components/SectionComments";
import { HeroSkeleton, CardSkeleton, PageTransition } from "@/components/PageSkeleton";

interface Profile { id: string; username: string; display_name: string; }
interface Reaction { id: string; user_id: string; section: string; emoji: string; }
interface Comment { id: string; user_id: string; section: string; message: string; created_at: string; }

export default function Uitslag() {
  const { user } = useAuth();
  const { activeTrip } = useTrip();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const tripId = activeTrip?.id;

  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      supabase.from("submissions").select("*").eq("trip_id", tripId),
      supabase.from("profiles").select("*"),
      supabase.from("reactions").select("*").eq("trip_id", tripId),
      supabase.from("comments").select("*").eq("trip_id", tripId),
    ]).then(([s, p, r, c]) => {
      setSubmissions((s.data as any[]) || []);
      setProfiles((p.data as any[]) || []);
      setReactions((r.data as any[]) || []);
      setComments((c.data as any[]) || []);
      setLoading(false);
    });

    const channel = supabase
      .channel("uitslag-social")
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        supabase.from("reactions").select("*").eq("trip_id", tripId).then(r => setReactions((r.data as any[]) || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        supabase.from("comments").select("*").eq("trip_id", tripId).then(c => setComments((c.data as any[]) || []));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  const handleToggleReaction = useCallback(async (section: string, emoji: string) => {
    if (!user || !tripId) return;
    const existing = reactions.find(r => r.user_id === user.id && r.section === section && r.emoji === emoji);
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("reactions").insert({ user_id: user.id, section, emoji, trip_id: tripId });
    }
  }, [user, reactions, tripId]);

  const handleAddComment = useCallback(async (section: string, message: string) => {
    if (!user || !tripId) return;
    await supabase.from("comments").insert({ user_id: user.id, section, message, trip_id: tripId });
  }, [user, tripId]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
  }, []);

  const lockedSubs = useMemo(() => submissions.filter(s => s.locked), [submissions]);
  const rules = useMemo(() => computeGroupRules(lockedSubs), [lockedSubs]);
  const avgPoints = useMemo(() => lockedSubs.length > 0 ? computeAvgPoints(lockedSubs) : null, [lockedSubs]);
  const getName = (userId: string) => profiles.find(p => p.id === userId)?.display_name || "?";

  const countVotes = (field: keyof Submission, value: any) => lockedSubs.filter(s => s[field] === value).length;
  const mobilityWinner = (() => {
    const car = countVotes("mobility_choice", "car");
    const taxi = countVotes("mobility_choice", "transfers");
    const neutral = countVotes("mobility_choice", "neutral");
    if (car > taxi && car > neutral) return { label: "Huurauto", Icon: Car };
    if (taxi > car && taxi > neutral) return { label: "Taxi / transfers", Icon: CarTaxiFront };
    return { label: "Geen voorkeur", Icon: Minus };
  })();

  const allDietPrefs = lockedSubs.flatMap(s => s.diet_preferences || []);
  const dietCounts: Record<string, number> = {};
  allDietPrefs.forEach(d => { dietCounts[d] = (dietCounts[d] || 0) + 1; });
  const allDietRemarks = lockedSubs.filter(s => s.diet_remarks).map(s => ({ user: getName(s.user_id), text: s.diet_remarks! }));

  const allActivities = lockedSubs.flatMap(s => s.activities || []);
  const activityCounts: Record<string, number> = {};
  allActivities.forEach(a => { activityCounts[a] = (activityCounts[a] || 0) + 1; });

  const allRemarks = lockedSubs.filter(s => s.remarks_a || s.remarks_b).map(s => ({ user: getName(s.user_id), text: [s.remarks_a, s.remarks_b].filter(Boolean).join(" | ") }));

  const budgets = lockedSubs.map(s => s.budget_cap_total).filter((b): b is number => b !== null && b > 0 && b < 100000);
  const budgetMedian = budgets.length > 0 ? budgets.sort((a, b) => a - b)[Math.floor(budgets.length / 2)] : null;

  const formatBudget = (v: number) => v >= 1000 ? `€${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `€${v}`;

  if (loading) {
    return (
      <AppLayout>
        <div>
          <HeroSkeleton />
          <div className="px-6 py-6 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </AppLayout>
    );
  }

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
    { label: "Golf gemak", value: avgPoints.golfEase, Icon: Flag },
    { label: "Strandleven", value: avgPoints.beachLife, Icon: Umbrella },
    { label: "Omgeving verkennen", value: avgPoints.exploring, Icon: Compass },
    { label: "Luxe & comfort", value: avgPoints.luxury, Icon: Gem },
    { label: "Budget bewust", value: avgPoints.budget, Icon: Wallet },
    { label: "Minimaal gedoe", value: avgPoints.lowHassle, Icon: Heart },
  ].sort((a, b) => b.value - a.value) : [];

  return (
    <AppLayout>
      <PageTransition>
        {/* Header */}
        <section className="bg-foreground text-white px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-2">Gezamenlijke uitslag</p>
          <h1 className="font-display text-2xl font-extrabold">Onze besluiten</h1>
          <p className="text-white/60 text-sm mt-2">Op basis van {lockedSubs.length} ingevulde intakes</p>
        </section>

        {/* ═══════════ TOPKANDIDAAT ═══════════ */}
        <section className="bg-primary/5 border-t border-primary/20">
          <div className="px-6 py-8">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-primary fill-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Topkandidaat accommodatie</p>
            </div>
            <h2 className="font-display text-xl font-extrabold mb-1">Villa Mercedes</h2>
            <p className="text-sm text-muted-foreground mb-4">Grote kans dat dit onze accommodatie wordt!</p>

            <div className="rounded-xl overflow-hidden mb-4 border border-border">
              <img src="/images/villa-mercedes-1.png" alt="Villa Mercedes - Fuengirola" className="w-full h-48 object-cover" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-background rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">Prijs (3 nachten)</p>
                <p className="font-display font-extrabold text-lg text-primary">€1.318</p>
                <p className="text-[10px] text-muted-foreground">incl. belastingen</p>
              </div>
              <div className="bg-background rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground">Beoordeling</p>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-primary fill-primary" />
                  <span className="font-display font-extrabold text-lg">4,06</span>
                </div>
                <p className="text-[10px] text-muted-foreground">18 recensies</p>
              </div>
            </div>

            <div className="bg-background rounded-lg p-4 border border-border space-y-2.5 mb-4">
              <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span>Fuengirola – 200m van het strand</span></div>
              <div className="flex items-center gap-2 text-sm"><Bed className="h-4 w-4 text-muted-foreground shrink-0" /><span>6 slaapkamers · 13 bedden · max 15 gasten</span></div>
              <div className="flex items-center gap-2 text-sm"><Bath className="h-4 w-4 text-muted-foreground shrink-0" /><span>4 badkamers</span></div>
              <div className="flex items-center gap-2 text-sm"><Waves className="h-4 w-4 text-muted-foreground shrink-0" /><span>Privé zoutwaterzwembad</span></div>
              <div className="flex items-center gap-2 text-sm"><Wind className="h-4 w-4 text-muted-foreground shrink-0" /><span>Airco warm/koud in elke kamer</span></div>
              <div className="flex items-center gap-2 text-sm"><Wifi className="h-4 w-4 text-muted-foreground shrink-0" /><span>Wifi in hele villa</span></div>
              <div className="flex items-center gap-2 text-sm"><ParkingCircle className="h-4 w-4 text-muted-foreground shrink-0" /><span>Eigen parkeerplaats</span></div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {["BBQ", "Speelkamer", "Pooltafel", "Tafelvoetbal", "Tafeltennis", "Terras", "Tuin 1000m²", "Gratis annuleren"].map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] py-0.5 px-2">{tag}</Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Onafhankelijke villa op 200m van het strand van Fuengirola. Het hoofdhuis heeft 4 slaapkamers, in de tuin nog 2 extra kamers. Speelkamer met pooltafel, tafelvoetbal en tafeltennis. Gratis annuleren vóór 5 maart 2026.
            </p>

            {/* Locatie & prijs */}
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Locatie & prijs</p>
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src="/images/villa-mercedes-locatie.png" alt="Locatie Villa Mercedes" className="w-full" />
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  De villa ligt in het hart van Fuengirola, vlak bij het strand en de boulevard. De prijs van <span className="font-semibold text-foreground">€1.318 voor 3 nachten</span> is inclusief alle belastingen – <span className="font-semibold text-foreground">~€220 p.p.</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Reistijd naar La Cala Golf</p>
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src="/images/villa-mercedes-reistijd-golf.png" alt="Reistijd villa naar La Cala Golf" className="w-full" />
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  La Cala Golf & Country Club ligt op <span className="font-semibold text-foreground">27–29 minuten rijden</span> (~16 km).
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Golfbanen in de omgeving</p>
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src="/images/villa-mercedes-golfbanen.png" alt="Golfbanen rondom Fuengirola" className="w-full" />
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Fuengirola is een uitstekende uitvalsbasis voor golf. Binnen 30 min liggen tal van banen.
                </p>

                <Accordion type="multiple" className="mt-3">
                  <AccordionItem value="lacala" className="border-border/50">
                    <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">La Cala Golf & Country Club</AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground space-y-1.5 pb-3">
                      <p>3 banen van 18 holes. ~27 min rijden.</p>
                      <a href="https://www.lacala.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">lacala.com <ExternalLink className="h-3 w-3" /></a>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="chaparral" className="border-border/50">
                    <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Chaparral Golf Club</AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground space-y-1.5 pb-3">
                      <p>Direct bij het strand. ~15 min rijden. Green fee €80–€110.</p>
                      <a href="https://golfelchaparral.com/en/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">golfelchaparral.com <ExternalLink className="h-3 w-3" /></a>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="santana" className="border-border/50">
                    <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Santana Golf</AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground space-y-1.5 pb-3">
                      <p>Par 72. ~20 min rijden.</p>
                      <a href="https://santanagolf.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">santanagolf.com <ExternalLink className="h-3 w-3" /></a>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="calanova" className="border-border/50">
                    <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Calanova Golf Club</AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground space-y-1.5 pb-3">
                      <p>18 holes, par 72. ~25 min rijden.</p>
                      <a href="https://calanovagolf.es" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">calanovagolf.es <ExternalLink className="h-3 w-3" /></a>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="miraflores" className="border-border/50">
                    <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">Miraflores Golf Club</AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground space-y-1.5 pb-3">
                      <p>18 holes, heuvels van Calahonda. ~20 min rijden.</p>
                      <a href="https://www.mirafloresgolf.es" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline">mirafloresgolf.es <ExternalLink className="h-3 w-3" /></a>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>

            <a href="https://www.airbnb.nl/rooms/17937917?guests=1&adults=1&s=67&unique_share_id=16ecca80-71b5-4f03-a49c-103551965b29" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
              Bekijk op Airbnb <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <ReactionBar section="villa-mercedes" reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
            <SectionComments section="villa-mercedes" comments={comments} profiles={profiles} onAdd={handleAddComment} onDelete={handleDeleteComment} />
          </div>
        </section>

        {/* ═══════════ BESLUITEN ═══════════ */}
        <div className="px-6 py-6 pb-24">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">Wat hebben we besloten?</p>

          <Accordion type="multiple" defaultValue={[]} className="space-y-3">

            {/* ── VERVOER ── */}
            <AccordionItem value="vervoer" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <Car className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Vervoer</span>
                  <Badge variant="outline" className="text-[10px] ml-auto flex items-center gap-1"><mobilityWinner.Icon className="h-3 w-3" /> {mobilityWinner.label}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><mobilityWinner.Icon className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="font-display font-extrabold text-lg">{mobilityWinner.label}</p>
                    <p className="text-xs text-muted-foreground">Meerderheidsuitslag</p>
                  </div>
                </div>
                <VoteBar items={[
                  { label: "Huurauto", count: countVotes("mobility_choice", "car") },
                  { label: "Taxi", count: countVotes("mobility_choice", "transfers") },
                  { label: "Neutraal", count: countVotes("mobility_choice", "neutral") },
                ]} total={lockedSubs.length} />
                <ReactionBar section="vervoer" reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                <SectionComments section="vervoer" comments={comments} profiles={profiles} onAdd={handleAddComment} onDelete={handleDeleteComment} />
              </AccordionContent>
            </AccordionItem>

            {/* ── ACCOMMODATIE EISEN ── */}
            <AccordionItem value="accommodatie" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <Home className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Accommodatie eisen</span>
                  <Badge variant="outline" className="text-[10px] ml-auto">{mustHaves.filter(m => m.active).length} vereist</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2 mb-6">
                  {mustHaves.map(mh => (
                    <div key={mh.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm">{mh.label}</span>
                      {mh.active ? (
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4" /> Vereist</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><XCircle className="h-4 w-4" /> Niet vereist</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="bg-secondary rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Max reistijd golf</span><span className="font-display font-bold">{rules.maxGolfMinutes} min</span></div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Locatievoorkeur</span>
                    <span className="font-display font-bold">{countVotes("base_choice", "golf") > countVotes("base_choice", "beach") ? "Bij golfbaan" : countVotes("base_choice", "beach") > countVotes("base_choice", "golf") ? "Bij strand" : "Neutraal"}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <VoteBar items={[
                    { label: "Golf", count: countVotes("base_choice", "golf") },
                    { label: "Strand", count: countVotes("base_choice", "beach") },
                    { label: "Neutraal", count: countVotes("base_choice", "neutral") },
                  ]} total={lockedSubs.length} />
                </div>
                <ReactionBar section="accommodatie" reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                <SectionComments section="accommodatie" comments={comments} profiles={profiles} onAdd={handleAddComment} onDelete={handleDeleteComment} />
              </AccordionContent>
            </AccordionItem>

            {/* ── BUDGET ── */}
            <AccordionItem value="budget" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Budget</span>
                  {budgetMedian && <Badge variant="outline" className="text-[10px] ml-auto">mediaan {formatBudget(budgetMedian)}</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {budgets.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Maximaal budget per persoon (totaal)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-secondary rounded-lg p-4 text-center">
                        <p className="font-display font-extrabold text-xl text-primary">{formatBudget(Math.min(...budgets))}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Laagste</p>
                      </div>
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                        <p className="font-display font-extrabold text-xl text-primary">{formatBudget(budgetMedian!)}</p>
                        <p className="text-[10px] text-primary/60 uppercase tracking-wider mt-1">Mediaan</p>
                      </div>
                      <div className="bg-secondary rounded-lg p-4 text-center">
                        <p className="font-display font-extrabold text-xl">{formatBudget(Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length))}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Gemiddeld</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per persoon</p>
                      {lockedSubs.map(s => {
                        const b = s.budget_cap_total;
                        const isOutlier = b !== null && b > 0 && b >= 100000;
                        return (
                          <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                            <span className="text-sm">{getName(s.user_id)}</span>
                            <span className="text-sm font-display font-bold tabular-nums">
                              {isOutlier ? (
                                <span className="text-muted-foreground font-normal italic">Geen limiet</span>
                              ) : b && b > 0 ? (
                                formatBudget(b)
                              ) : (
                                <span className="text-muted-foreground font-normal italic">Geen limiet</span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">🤷</p>
                    <p className="text-sm text-muted-foreground">Niemand heeft een budgetlimiet opgegeven</p>
                  </div>
                )}
                <ReactionBar section="budget" reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                <SectionComments section="budget" comments={comments} profiles={profiles} onAdd={handleAddComment} onDelete={handleDeleteComment} />
              </AccordionContent>
            </AccordionItem>

            {/* ── PRIORITEITEN ── */}
            <AccordionItem value="prioriteiten" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Prioriteiten</span>
                  {pointsData.length > 0 && (() => { const TopIcon = pointsData[0].Icon; return <Badge variant="outline" className="text-[10px] ml-auto flex items-center gap-1"><TopIcon className="h-3 w-3" /> {pointsData[0].label}</Badge>; })()}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground mb-4">Gemiddelde puntenverdeling van de groep</p>
                <div className="space-y-3">
                  {pointsData.map((p, i) => {
                    const PIcon = p.Icon;
                    return (
                    <div key={p.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center gap-2"><PIcon className="h-4 w-4 text-primary" /> {p.label} {i === 0 && <Badge className="text-[9px] ml-1">Hoogste</Badge>}</span>
                        <span className="font-display font-bold text-sm tabular-nums">{p.value.toFixed(0)}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                        <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(p.value * 2.5, 100)}%` }} />
                      </div>
                    </div>
                    );
                  })}
                </div>
                <ReactionBar section="prioriteiten" reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                <SectionComments section="prioriteiten" comments={comments} profiles={profiles} onAdd={handleAddComment} onDelete={handleDeleteComment} />
              </AccordionContent>
            </AccordionItem>

            {/* ── ETEN & DRINKEN ── */}
            <AccordionItem value="eten" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Eten & drinken</span>
                  {Object.keys(dietCounts).length > 0 && (
                    <Badge variant="outline" className="text-[10px] ml-auto">{Object.keys(dietCounts).length} voorkeuren</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {Object.keys(dietCounts).length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Eetvoorkeuren binnen de groep</p>
                    <div className="space-y-2">
                      {Object.entries(dietCounts).sort(([, a], [, b]) => b - a).map(([diet, count]) => (
                        <div key={diet} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <span className="text-sm">{translateLabel(DIET_LABELS, diet)}</span>
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
                  <div className="text-center py-6">
                    <p className="text-3xl mb-2">🍕</p>
                    <p className="text-sm text-muted-foreground">Geen specifieke eetvoorkeuren — alles mag!</p>
                  </div>
                )}
                {allDietRemarks.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opmerkingen</p>
                    {allDietRemarks.map((r, i) => (
                      <div key={i} className="bg-secondary rounded-lg p-3 text-sm">
                        <span className="font-semibold">{r.user}:</span>{" "}
                        <span className="text-muted-foreground">{r.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                <ReactionBar section="eten" reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                <SectionComments section="eten" comments={comments} profiles={profiles} onAdd={handleAddComment} onDelete={handleDeleteComment} />
              </AccordionContent>
            </AccordionItem>

            {/* ── ACTIVITEITEN ── */}
            <AccordionItem value="activiteiten" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <Dumbbell className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Activiteiten</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {Object.keys(activityCounts).length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Wat willen we doen naast golf?</p>
                    <div className="space-y-2">
                      {Object.entries(activityCounts).sort(([, a], [, b]) => b - a).map(([act, count]) => (
                        <div key={act} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <span className="text-sm">{translateLabel(ACTIVITY_LABELS, act)}</span>
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
                <ReactionBar section="activiteiten" reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                <SectionComments section="activiteiten" comments={comments} profiles={profiles} onAdd={handleAddComment} onDelete={handleDeleteComment} />
              </AccordionContent>
            </AccordionItem>

            {/* ── REISTIJDENMATRIX ── */}
            <AccordionItem value="reistijden" className="border rounded-lg border-border/60 overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/5">
                <div className="flex items-center gap-2 w-full">
                  <Map className="h-4 w-4 text-primary" />
                  <span className="font-display font-bold text-sm">Reistijdenmatrix</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <POIMatrix />
                <ReactionBar section="reistijden" reactions={reactions} profiles={profiles} onToggle={handleToggleReaction} />
                <SectionComments section="reistijden" comments={comments} profiles={profiles} onAdd={handleAddComment} onDelete={handleDeleteComment} />
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        {/* Opmerkingen */}
        {allRemarks.length > 0 && (
          <section className="px-6 py-8 border-t">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Opmerkingen van deelnemers</p>
            <div className="space-y-2">
              {allRemarks.map((r, i) => (
                <div key={i} className="bg-secondary rounded-lg p-3 text-sm">
                  <span className="font-semibold">{r.user}:</span> <span className="text-muted-foreground italic">{r.text}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <section className="bg-foreground px-6 py-8 text-center">
          <p className="text-white/40 text-xs">Resultaten op basis van {lockedSubs.length} van {activeTrip?.group_size || 6} intakes</p>
        </section>
      </div>
    </AppLayout>
  );
}

function VoteBar({ items, total }: { items: { label: string; count: number }[]; total: number }) {
  return (
    <div className="flex gap-2">
      {items.map(item => {
        const isMajority = item.count >= Math.ceil(total / 2);
        return (
          <div key={item.label} className={`flex-1 text-center rounded-lg py-3 text-xs font-medium transition-colors ${isMajority ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary text-muted-foreground"}`}>
            <p className="font-display font-extrabold text-lg">{item.count}</p>
            <p className="mt-0.5">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}
