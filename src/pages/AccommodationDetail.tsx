import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { ArrowLeft, ExternalLink, BedDouble, Bath, Car, Clock, Waves, Plane, CheckCircle2, XCircle } from "lucide-react";
import { computeGroupRules, checkEligibility, type Accommodation, type Submission } from "@/lib/scoring";
import { useLogEvent } from "@/contexts/ActivityLogContext";

export default function AccommodationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const logEvent = useLogEvent();
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
    // Log accommodation view
    if (id) {
      logEvent("accommodation_view", `/accommodations/${id}`, id);
    }
  }, [id, user]);

  const rules = useMemo(() => computeGroupRules(submissions), [submissions]);
  const eligibility = useMemo(() => acc ? checkEligibility(acc, rules) : null, [acc, rules]);

  if (loading) return <AppLayout><div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></AppLayout>;
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
      <div className="-mx-4 -mt-6 space-y-0">
        {/* Image carousel with back button overlay */}
        <div className="relative">
          <Button
            variant="ghost" size="icon"
            onClick={() => navigate(-1)}
            className="absolute top-3 left-3 z-20 h-9 w-9 bg-black/50 text-white hover:bg-black/70 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {acc.image_urls.length > 0 && (
            <Carousel className="w-full">
              <CarouselContent>
                {acc.image_urls.map((url, i) => (
                  <CarouselItem key={i}>
                    <div className="aspect-[16/10]">
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
        </div>

        {/* Title + badges */}
        <div className="bg-foreground text-background px-6 py-5">
          <h2 className="font-display text-xl font-extrabold text-white">{acc.name}</h2>
          <p className="text-white/50 text-sm mt-1">{acc.location_label} &middot; {acc.type}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {eligibility?.eligible ? (
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold rounded-md">GESCHIKT</Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px] font-bold rounded-md">NIET GESCHIKT</Badge>
            )}
            {acc.status === "finalist" && <Badge className="bg-warning text-warning-foreground text-[10px] font-bold rounded-md">FINALIST</Badge>}
            {acc.cancellation_type !== "unknown" && (
              <Badge variant="outline" className="text-[10px] font-bold rounded-md border-white/20 text-white/70">
                {acc.cancellation_type === "free" ? "GRATIS ANNULERING" : acc.cancellation_type === "partial" ? "GEDEELTELIJK" : "NON-REFUNDABLE"}
              </Badge>
            )}
          </div>
          <p className="font-display font-extrabold text-2xl text-white mt-4">
            {acc.total_price_3_nights ? (
              <>EUR {acc.total_price_3_nights} <span className="text-sm font-normal text-white/40">/ 3 nachten</span></>
            ) : (
              <span className="text-sm font-normal text-white/40">Prijs nog onbekend</span>
            )}
          </p>
        </div>

        {/* Stats grid */}
        <div className="px-6 py-5 bg-background">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">Kenmerken</p>
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5 bg-secondary rounded-lg p-3">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="px-6 pb-5 bg-background">
          <div className="rounded-xl overflow-hidden border">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${acc.lng - 0.02},${acc.lat - 0.01},${acc.lng + 0.02},${acc.lat + 0.01}&layer=mapnik&marker=${acc.lat},${acc.lng}`}
              className="w-full h-48"
              title="Locatie"
            />
          </div>
        </div>

        {/* Criteria check */}
        <div className="bg-foreground text-background px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-3">Criteria check</p>
          <div className="space-y-2">
            {eligibility?.eligible ? (
              <div className="flex items-center gap-2 text-primary font-semibold text-sm"><CheckCircle2 className="h-4 w-4" /> Alle criteria gehaald</div>
            ) : (
              eligibility?.failures.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-red-400 text-sm"><XCircle className="h-4 w-4 shrink-0" /> {f}</div>
              ))
            )}
          </div>
        </div>

        {/* Sources */}
        {sources.length > 0 && (
          <div className="px-6 py-5 bg-background space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">Bronnen</p>
            {sources.map((s: any, i: number) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 border rounded-lg p-3 hover:bg-secondary transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold">{s.label}</p>
                  {s.note && <p className="text-xs text-muted-foreground truncate">{s.note}</p>}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        )}

        {acc.notes && (
          <div className="px-6 py-5 bg-secondary">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Notities</p>
            <p className="text-sm leading-relaxed">{acc.notes}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
