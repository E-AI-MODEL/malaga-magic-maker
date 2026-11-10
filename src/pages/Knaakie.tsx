import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError, FormField, FormSheet, FormSubmit } from "@/components/FormSheet";
import { useTrip } from "@/contexts/TripContext";
import { KostenSection } from "@/features/together/KostenSection";
import { describePlanLimit, FREE_LIMITS } from "@/features/pro/limits";

export default function Knaakie() {
  const { userTrips, loading, activeTrip, openTrip, createTrip } = useTrip();
  const [params, setParams] = useSearchParams();
  const tripId = params.get("tripId");
  const [readyId, setReadyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = userTrips.find((trip) => trip.id === tripId);
  const selectedId = selected?.id;

  useEffect(() => {
    if (loading || tripId) return;
    const first = [...userTrips].filter((trip) => trip.status !== "archived")
      .sort((a, b) => (a.start_date || "9999").localeCompare(b.start_date || "9999"))[0] || userTrips[0];
    if (first) setParams({ tripId: first.id }, { replace: true });
  }, [loading, tripId, userTrips, setParams]);

  useEffect(() => {
    setReadyId(null);
    setFailed(false);
    if (!selectedId) return;
    let cancelled = false;
    void openTrip(selectedId).then((trip) => {
      if (cancelled) return;
      setReadyId(trip?.id || null);
      setFailed(!trip);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [selectedId, openTrip]);

  const closeCreate = () => {
    setCreating(false);
    setName("");
    setError("");
  };

  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Geef je Knaakie een naam.");
      return;
    }
    setSaving(true);
    setError("");
    void (async () => {
      try {
        const trip = await createTrip({ name: trimmed, group_size: 1, currency: "EUR" });
        if (!trip) {
          setError("Je Knaakie kon niet worden gemaakt. Probeer het opnieuw.");
          return;
        }
        setParams({ tripId: trip.id }, { replace: true });
        closeCreate();
      } catch (err) {
        setError(describePlanLimit(err) || "Je Knaakie kon niet worden gemaakt. Probeer het opnieuw.");
      } finally {
        setSaving(false);
      }
    })();
  };

  const createButton = (label: string, className: string) => (
    <Button type="button" variant="secondary" onClick={() => setCreating(true)} className={className}>
      <Plus className="h-4 w-4" strokeWidth={1.75} />{label}
    </Button>
  );

  return <AppLayout>
    <div className="px-5 pb-5 pt-3 sm:pt-6">
      <h1 className="mb-4 font-brand text-[28px] font-bold leading-tight">Knaakie</h1>
      {loading ? <p className="text-muted-foreground">Laden…</p> : !userTrips.length ?
        createButton("Nieuwe Knaakie", "tile-plain h-16 w-full text-base") : <>
          <Select value={selected?.id || ""} onValueChange={(id) => setParams({ tripId: id }, { replace: true })}>
            <SelectTrigger aria-label="Kies een Knaakie" className="tile-plain mb-3"><SelectValue placeholder="Kies een Knaakie" /></SelectTrigger>
            <SelectContent>{userTrips.map((trip) => <SelectItem key={trip.id} value={trip.id}>{trip.name}{trip.status === "archived" ? " · Gearchiveerd" : ""}</SelectItem>)}</SelectContent>
          </Select>
          {createButton("Nieuwe Knaakie", "tile-plain mb-4 h-12 w-full text-base")}
          {!selected ? <p className="text-muted-foreground">Kies een Knaakie.</p> : failed ?
            <p className="text-muted-foreground">Deze Knaakie is nu niet beschikbaar.</p> : readyId === selected.id && activeTrip?.id === selected.id ?
              <KostenSection key={selected.id} /> : <p className="text-muted-foreground">Laden…</p>}
        </>}
    </div>
    <FormSheet open={creating} onOpenChange={(open) => (open ? setCreating(true) : closeCreate())} title="Nieuwe Knaakie">
      <form onSubmit={submitCreate} className="mt-5">
        <FormField label="Geef je Knaakie een naam" htmlFor="knaakie-naam" hint={`Bijvoorbeeld Zomer 2027 of Festival 2027. Gratis tot ${FREE_LIMITS.trips} Knaakies.`}>
          <Input
            id="knaakie-naam"
            aria-label="Naam van de Knaakie"
            autoFocus
            autoComplete="off"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Festival 2027"
            className="h-14 rounded-2xl text-lg"
          />
        </FormField>
        <FormError message={error} />
        <FormSubmit saving={saving}>Maak aan</FormSubmit>
      </form>
    </FormSheet>
  </AppLayout>;
}
