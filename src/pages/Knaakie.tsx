import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTrip } from "@/contexts/TripContext";
import { KostenSection } from "@/features/together/KostenSection";

export default function Knaakie() {
  const { userTrips, loading, activeTrip, openTrip } = useTrip();
  const [params, setParams] = useSearchParams();
  const tripId = params.get("tripId");
  const [readyId, setReadyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const selected = userTrips.find((trip) => trip.id === tripId);

  useEffect(() => {
    if (loading || tripId) return;
    const first = [...userTrips].filter((trip) => trip.status !== "archived")
      .sort((a, b) => (a.start_date || "9999").localeCompare(b.start_date || "9999"))[0] || userTrips[0];
    if (first) setParams({ tripId: first.id }, { replace: true });
  }, [loading, tripId, userTrips, setParams]);

  useEffect(() => {
    setReadyId(null);
    setFailed(false);
    if (!selected) return;
    let cancelled = false;
    void openTrip(selected.id).then((trip) => {
      if (cancelled) return;
      setReadyId(trip?.id || null);
      setFailed(!trip);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [selected?.id, openTrip]);

  return <AppLayout>
    <div className="px-5 pb-5 pt-3 sm:pt-6">
      <h1 className="mb-4 font-brand text-[28px] font-bold leading-tight">Knaakie</h1>
      {loading ? <p className="text-muted-foreground">Laden…</p> : !userTrips.length ?
        <Button asChild variant="secondary" className="tile-plain h-16 w-full text-base"><Link to="/new-trip"><Plus />Nieuwe reis</Link></Button> : <>
          <Select value={selected?.id || ""} onValueChange={(id) => setParams({ tripId: id }, { replace: true })}>
            <SelectTrigger aria-label="Kies een reis" className="tile-plain mb-4"><SelectValue placeholder="Kies een reis" /></SelectTrigger>
            <SelectContent>{userTrips.map((trip) => <SelectItem key={trip.id} value={trip.id}>{trip.name}{trip.status === "archived" ? " · Gearchiveerd" : ""}</SelectItem>)}</SelectContent>
          </Select>
          {!selected ? <p className="text-muted-foreground">Kies een reis.</p> : failed ?
            <p className="text-muted-foreground">Deze reis is nu niet beschikbaar.</p> : readyId === selected.id && activeTrip?.id === selected.id ?
              <KostenSection key={selected.id} /> : <p className="text-muted-foreground">Laden…</p>}
        </>}
    </div>
  </AppLayout>;
}