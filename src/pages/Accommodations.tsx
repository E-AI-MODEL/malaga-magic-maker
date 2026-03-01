import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { MapPin, BedDouble, Car, Clock, Waves, ChevronRight } from "lucide-react";
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

  if (loading) return <AppLayout><div className="flex justify-center py-12">Laden...</div></AppLayout>;

  const baseLabel = (loc: string) => {
    if (["La Cala Golf"].includes(loc)) return "⛳ Golf-base";
    if (["La Cala de Mijas", "Calahonda", "Fuengirola"].includes(loc)) return "🏖️ Strand-base";
    return "📍 " + loc;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold">🏠 Verblijven</h2>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
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
            <Label htmlFor="eligible" className="text-sm">Eligible only</Label>
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
    <Card className={`overflow-hidden ${acc.status === "eliminated" ? "opacity-50" : ""}`}>
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
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-sm leading-tight">{acc.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{baseLabel(acc.location_label)}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display font-bold text-lg text-primary">{acc.totalScore.toFixed(0)}</div>
            <div className="text-[10px] text-muted-foreground">score</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {acc.eligibility.eligible ? (
            <Badge className="bg-success text-success-foreground text-[10px]">✓ Eligible</Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px]">✗ Not eligible</Badge>
          )}
          {acc.status === "finalist" && <Badge className="bg-secondary text-secondary-foreground text-[10px]">🏆 Finalist</Badge>}
          {acc.status === "eliminated" && <Badge variant="outline" className="text-[10px]">Eliminated</Badge>}
        </div>

        <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {acc.bedrooms}k / {acc.fixed_beds_count}b</div>
          <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {acc.golf_minutes ?? "?"}m golf</div>
          <div className="flex items-center gap-1"><Waves className="h-3 w-3" /> {acc.beach_meters ?? "?"}m</div>
          <div className="flex items-center gap-1"><Car className="h-3 w-3" /> {acc.parking === "yes" ? "✓" : acc.parking === "no" ? "✗" : "?"}</div>
        </div>

        {acc.total_price_3_nights && (
          <p className="text-sm font-semibold">€{acc.total_price_3_nights} <span className="text-xs font-normal text-muted-foreground">/ 3 nachten</span></p>
        )}

        {acc.topReasons.length > 0 && (
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            {acc.topReasons.map((r, i) => <div key={i}>• {r}</div>)}
          </div>
        )}

        <Button variant="outline" size="sm" className="w-full" onClick={onDetail}>
          Details <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
