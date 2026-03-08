import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useTrip } from "@/contexts/TripContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { BedDouble, Car, Clock, Waves, ArrowRight } from "lucide-react";
import { rankAccommodations, computeGroupRules, type Accommodation, type Submission, type RankedAccommodation } from "@/lib/scoring";
import heroVilla from "@/assets/hero-villa.jpg";
import { useLogEvent } from "@/contexts/ActivityLogContext";
import { HeroSkeleton, CardSkeleton } from "@/components/PageSkeleton";

export default function Accommodations() {
  const navigate = useNavigate();
  const { activeTrip } = useTrip();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const logEvent = useLogEvent();
  const [sortBy, setSortBy] = useState("score");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  const tripId = activeTrip?.id;

  useEffect(() => {
    if (!tripId) return;
    Promise.all([
      supabase.from("accommodations").select("*").eq("trip_id", tripId),
      supabase.from("submissions").select("*").eq("locked", true).eq("trip_id", tripId),
    ]).then(([accRes, subRes]) => {
      setAccommodations((accRes.data as any[]) || []);
      setSubmissions((subRes.data as any[]) || []);
      setLoading(false);
    });
  }, [tripId]);

  const rules = useMemo(() => computeGroupRules(submissions), [submissions]);
  const ranked = useMemo(() => rankAccommodations(accommodations, submissions, rules), [accommodations, submissions, rules]);

  const filtered = useMemo(() => {
    let items = [...ranked];
    if (eligibleOnly) items = items.filter(a => a.eligibility.eligible && a.status !== "eliminated");
    if (sortBy === "price") items.sort((a, b) => (a.total_price_3_nights ?? 9999) - (b.total_price_3_nights ?? 9999));
    else if (sortBy === "golf") items.sort((a, b) => (a.golf_minutes ?? 99) - (b.golf_minutes ?? 99));
    else if (sortBy === "beach") items.sort((a, b) => (a.beach_meters ?? 99999) - (b.beach_meters ?? 99999));
    return items;
  }, [ranked, sortBy, eligibleOnly]);

  if (loading) {
    return (
      <AppLayout>
        <div>
          <HeroSkeleton />
          <div className="px-4 py-4 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </AppLayout>
    );
  }

  const baseLabel = (loc: string) => {
    if (["La Cala Golf"].includes(loc)) return "Golf-base";
    if (["La Cala de Mijas", "Calahonda", "Fuengirola"].includes(loc)) return "Strand-base";
    return loc;
  };

  return (
    <AppLayout>
      <div className="space-y-0">
        {/* Hero header */}
        <div className="relative h-32">
          <img src={heroVilla} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/80" />
          <div className="relative z-10 flex items-end h-full px-6 pb-4">
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em]">Verblijven</p>
              <h2 className="font-display text-2xl font-extrabold text-white mt-1">{filtered.length} opties</h2>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-foreground px-6 py-3 flex items-center gap-3 flex-wrap">
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); logEvent("accommodation_list_filter", "/accommodations", `sort:${v}`); }}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-white/10 border-white/15 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Ranking</SelectItem>
              <SelectItem value="price">Prijs</SelectItem>
              <SelectItem value="golf">Golf afstand</SelectItem>
              <SelectItem value="beach">Strand</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={eligibleOnly} onCheckedChange={(v) => { setEligibleOnly(v); logEvent("accommodation_list_filter", "/accommodations", `eligible_only:${v}`); }} id="eligible" />
            <Label htmlFor="eligible" className="text-[11px] text-white/50 font-medium">Eligible only</Label>
          </div>
        </div>

        {/* Cards — responsive grid on desktop */}
        <div className="px-4 py-4 bg-background">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((acc) => (
              <AccommodationCard key={acc.id} acc={acc} baseLabel={baseLabel} onDetail={() => navigate(`/accommodations/${acc.id}`)} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function AccommodationCard({ acc, baseLabel, onDetail }: { acc: RankedAccommodation; baseLabel: (loc: string) => string; onDetail: () => void }) {
  return (
    <div className={`rounded-xl overflow-hidden bg-card border transition-opacity ${acc.status === "eliminated" ? "opacity-30" : ""}`}>
      {acc.image_urls.length > 0 && (
        <Carousel className="w-full">
          <CarouselContent>
            {acc.image_urls.map((url, i) => (
              <CarouselItem key={i}>
                <div className="aspect-[16/9] relative">
                  <img src={url} alt={`${acc.name} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  {/* Score overlay */}
                  {i === 0 && (
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center">
                      <div className="font-display font-extrabold text-lg text-white leading-none">{acc.totalScore.toFixed(0)}</div>
                      <div className="text-[9px] text-white/50 font-semibold uppercase tracking-wider">score</div>
                    </div>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {acc.image_urls.length > 1 && (
            <>
              <CarouselPrevious className="left-2 h-7 w-7" />
              <CarouselNext className="right-2 h-7 w-7" />
            </>
          )}
        </Carousel>
      )}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display font-extrabold text-sm leading-tight">{acc.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{baseLabel(acc.location_label)} &middot; {acc.location_label}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {acc.eligibility.eligible ? (
            <Badge className="bg-primary text-primary-foreground text-[10px] font-bold rounded-md">ELIGIBLE</Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] font-bold rounded-md">NOT ELIGIBLE</Badge>
          )}
          {acc.status === "finalist" && <Badge className="bg-warning text-warning-foreground text-[10px] font-bold rounded-md">FINALIST</Badge>}
          {acc.status === "eliminated" && <Badge variant="outline" className="text-[10px] font-bold rounded-md">ELIMINATED</Badge>}
        </div>

        <div className="grid grid-cols-4 gap-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1"><BedDouble className="h-3 w-3 shrink-0" /> {acc.bedrooms}k/{acc.fixed_beds_count}b</div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" /> {acc.golf_minutes ?? "?"}m</div>
          <div className="flex items-center gap-1"><Waves className="h-3 w-3 shrink-0" /> {acc.beach_meters ?? "?"}m</div>
          <div className="flex items-center gap-1"><Car className="h-3 w-3 shrink-0" /> {acc.parking === "yes" ? "Ja" : acc.parking === "no" ? "Nee" : "?"}</div>
        </div>

        <p className="font-display font-extrabold text-base">
          {acc.total_price_3_nights ? (
            <>EUR {acc.total_price_3_nights} <span className="text-xs font-normal text-muted-foreground">/ 3 nachten</span></>
          ) : (
            <span className="text-xs font-normal text-muted-foreground">Prijs nog onbekend</span>
          )}
        </p>

        {acc.topReasons.length > 0 && (
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            {acc.topReasons.map((r, i) => <div key={i}>&middot; {r}</div>)}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full gap-1 text-xs font-bold" onClick={onDetail}>
          Bekijk details <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
