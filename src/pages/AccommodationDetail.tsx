import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { ArrowLeft, ExternalLink, MapPin, BedDouble, Bath, Car, Clock, Waves, Plane, CheckCircle2, XCircle } from "lucide-react";
import { computeGroupRules, checkEligibility, type Accommodation, type Submission } from "@/lib/scoring";

export default function AccommodationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [acc, setAcc] = useState<Accommodation | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("accommodations").select("*").eq("id", id).single(),
      supabase.from("submissions").select("*").eq("locked", true),
    ]).then(([accRes, subRes]) => {
      setAcc(accRes.data as any);
      setSubmissions((subRes.data as any[]) || []);
      setLoading(false);
    });
  }, [id]);

  const rules = useMemo(() => computeGroupRules(submissions), [submissions]);
  const eligibility = useMemo(() => acc ? checkEligibility(acc, rules) : null, [acc, rules]);

  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;
  if (!acc) return <AppLayout><p className="py-12 text-center text-muted-foreground">Niet gevonden</p></AppLayout>;

  const sources = Array.isArray(acc.sources) ? acc.sources : [];

  const stats = [
    { icon: BedDouble, label: "Slaapkamers", value: acc.bedrooms },
    { icon: Bath, label: "Badkamers", value: acc.bathrooms },
    { icon: BedDouble, label: "Vaste bedden", value: acc.fixed_beds_count },
    { icon: Clock, label: "Golf", value: acc.golf_minutes ? `${acc.golf_minutes} min` : "Onbekend" },
    { icon: Waves, label: "Strand", value: acc.beach_meters ? `${acc.beach_meters}m` : "Onbekend" },
    { icon: Plane, label: "Vliegveld", value: acc.agp_minutes ? `${acc.agp_minutes} min` : "Onbekend" },
    { icon: Car, label: "Parkeren", value: acc.parking === "yes" ? "Ja" : acc.parking === "no" ? "Nee" : "Onbekend" },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 -ml-2 text-xs font-medium">
          <ArrowLeft className="h-4 w-4" /> Terug
        </Button>

        {acc.image_urls.length > 0 && (
          <Carousel className="w-full">
            <CarouselContent>
              {acc.image_urls.map((url, i) => (
                <CarouselItem key={i}>
                  <div className="aspect-[16/10] rounded-lg overflow-hidden">
                    <img src={url} alt={`${acc.name} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {acc.image_urls.length > 1 && (
              <>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </>
            )}
          </Carousel>
        )}

        <div>
          <h2 className="font-display text-xl font-extrabold">{acc.name}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5" /> {acc.location_label} · {acc.type}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {eligibility?.eligible ? (
            <Badge className="bg-primary/10 text-primary border-primary/20 font-semibold">Eligible</Badge>
          ) : (
            <Badge variant="destructive">Not eligible</Badge>
          )}
          {acc.status === "finalist" && <Badge className="bg-warning text-warning-foreground">Finalist</Badge>}
          {acc.cancellation_type !== "unknown" && (
            <Badge variant="outline">{acc.cancellation_type === "free" ? "Gratis annulering" : acc.cancellation_type === "partial" ? "Gedeeltelijk" : "Non-refundable"}</Badge>
          )}
        </div>

        {acc.total_price_3_nights && (
          <div className="text-2xl font-display font-extrabold">€{acc.total_price_3_nights} <span className="text-sm font-normal text-muted-foreground">/ 3 nachten</span></div>
        )}

        {/* Stats */}
        <div className="border rounded-lg p-4 grid grid-cols-2 gap-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{label}:</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="rounded-lg overflow-hidden border">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${acc.lng - 0.02},${acc.lat - 0.01},${acc.lng + 0.02},${acc.lat + 0.01}&layer=mapnik&marker=${acc.lat},${acc.lng}`}
            className="w-full h-48"
            title="Locatie"
          />
        </div>

        {/* Eligibility details */}
        <div className="border rounded-lg p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Criteria check</p>
          <div className="space-y-1.5 text-sm">
            {eligibility?.eligible ? (
              <div className="flex items-center gap-2 text-primary font-medium"><CheckCircle2 className="h-4 w-4" /> Alle criteria gehaald</div>
            ) : (
              eligibility?.failures.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-destructive"><XCircle className="h-4 w-4 shrink-0" /> {f}</div>
              ))
            )}
          </div>
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bronnen</p>
            {sources.map((s: any, i: number) => (
              <div key={i} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.label}</p>
                  {s.note && <p className="text-xs text-muted-foreground truncate">{s.note}</p>}
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0 text-xs">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="gap-1">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}

        {acc.notes && (
          <div className="text-sm text-muted-foreground bg-secondary rounded-lg p-3">
            <span className="font-semibold text-foreground">Notities:</span> {acc.notes}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
