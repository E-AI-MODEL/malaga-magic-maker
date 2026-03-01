import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { BedDouble, Car, Clock, Waves, ArrowRight } from "lucide-react";
import { rankAccommodations, computeGroupRules, type Accommodation, type Submission, type RankedAccommodation } from "@/lib/scoring";

export default function Accommodations() {
  const navigate = useNavigate();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("score");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("accommodations").select("*"),
      supabase.from("submissions").select("*").eq("locked", true),
    ]).then(([accRes, subRes]) => {
      setAccommodations((accRes.data as any[]) || []);
      setSubmissions((subRes.data as any[]) || []);
      setLoading(false);
    });
  }, []);

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

  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;

  const baseLabel = (loc: string) => {
    if (["La Cala Golf"].includes(loc)) return "Golf-base";
    if (["La Cala de Mijas", "Calahonda", "Fuengirola"].includes(loc)) return "Strand-base";
    return loc;
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Verblijven</p>
          <h2 className="font-display text-xl font-extrabold">{filtered.length} opties</h2>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Ranking score</SelectItem>
              <SelectItem value="price">Prijs</SelectItem>
              <SelectItem value="golf">Golf afstand</SelectItem>
              <SelectItem value="beach">Strand afstand</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch checked={eligibleOnly} onCheckedChange={setEligibleOnly} id="eligible" />
            <Label htmlFor="eligible" className="text-xs font-medium">Eligible only</Label>
          </div>
        </div>

        <div className="space-y-4">
          {filtered.map((acc) => (
            <AccommodationCard key={acc.id} acc={acc} baseLabel={baseLabel} onDetail={() => navigate(`/accommodations/${acc.id}`)} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function AccommodationCard({ acc, baseLabel, onDetail }: { acc: RankedAccommodation; baseLabel: (loc: string) => string; onDetail: () => void }) {
  return (
    <div className={`border rounded-lg overflow-hidden bg-card transition-opacity ${acc.status === "eliminated" ? "opacity-40" : ""}`}>
      {acc.image_urls.length > 0 && (
        <Carousel className="w-full">
          <CarouselContent>
            {acc.image_urls.map((url, i) => (
              <CarouselItem key={i}>
                <div className="aspect-[16/10] relative">
                  <img src={url} alt={`${acc.name} foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
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
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-sm leading-tight truncate">{acc.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{baseLabel(acc.location_label)} · {acc.location_label}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display font-extrabold text-lg text-primary leading-none">{acc.totalScore.toFixed(0)}</div>
            <div className="text-[10px] text-muted-foreground font-medium">punten</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {acc.eligibility.eligible ? (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">Eligible</Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px]">Not eligible</Badge>
          )}
          {acc.status === "finalist" && <Badge className="bg-warning text-warning-foreground text-[10px]">Finalist</Badge>}
          {acc.status === "eliminated" && <Badge variant="outline" className="text-[10px]">Eliminated</Badge>}
        </div>

        <div className="grid grid-cols-4 gap-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1"><BedDouble className="h-3 w-3 shrink-0" /> {acc.bedrooms}k/{acc.fixed_beds_count}b</div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" /> {acc.golf_minutes ?? "?"}m</div>
          <div className="flex items-center gap-1"><Waves className="h-3 w-3 shrink-0" /> {acc.beach_meters ?? "?"}m</div>
          <div className="flex items-center gap-1"><Car className="h-3 w-3 shrink-0" /> {acc.parking === "yes" ? "✓" : acc.parking === "no" ? "✗" : "?"}</div>
        </div>

        {acc.total_price_3_nights && (
          <p className="text-sm font-display font-bold">€{acc.total_price_3_nights} <span className="text-xs font-normal text-muted-foreground">/ 3 nachten</span></p>
        )}

        {acc.topReasons.length > 0 && (
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            {acc.topReasons.map((r, i) => <div key={i}>· {r}</div>)}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full gap-1 text-xs font-semibold" onClick={onDetail}>
          Details <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
