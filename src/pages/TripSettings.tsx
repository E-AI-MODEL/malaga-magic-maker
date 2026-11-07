import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Archive, ArrowLeft, CalendarDays, MapPin, RotateCcw, Save, Settings, Users, StickyNote } from "lucide-react";
import { useTrip } from "@/contexts/TripContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/primitives";
import { FormSheet, FormSubmit } from "@/components/FormSheet";
import { AppLayout } from "@/components/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listTripItems } from "@/features/travel/data";
import { dateShiftAnchor, itemsOutsideTrip, shiftItemDates } from "@/features/travel/presentation";

const currencies = ["EUR", "USD", "GBP", "CHF"];

export default function TripSettings() {
  const { activeTrip, isOrganizer, updateTrip, archiveTrip, restoreTrip } = useTrip();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupSize, setGroupSize] = useState("1");
  const [currency, setCurrency] = useState("EUR");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [panel, setPanel] = useState<"naam" | "bestemming" | "data" | "reizigers" | "notitie" | "archief" | null>(null);

  useEffect(() => {
    if (!activeTrip) return;
    setName(activeTrip.name);
    setDestination(activeTrip.destination_name || "");
    setCountry(activeTrip.destination_country || "");
    setStartDate(activeTrip.start_date || "");
    setEndDate(activeTrip.end_date || "");
    setGroupSize(String(activeTrip.group_size || 1));
    setCurrency(activeTrip.currency || "EUR");
    setDescription(activeTrip.description || "");
  }, [activeTrip]);

  if (!activeTrip) return null;

  if (!isOrganizer) {
    return (
      <AppLayout><div className="mx-auto max-w-xl px-5 py-10">
        <Button asChild variant="ghost" className="-ml-3 mb-6">
          <Link to={`/trip/${activeTrip.id}`}><ArrowLeft className="mr-2 h-4 w-4" />Terug</Link>
        </Button>
        <PageHeader title="Reisinstellingen" />
        <p className="mt-3 text-sm text-muted-foreground">Alleen de organisator van deze reis kan deze gegevens wijzigen.</p>
      </div></AppLayout>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaved(false);

    if (!name.trim()) {
      setError("De reis heeft een naam nodig.");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError("De einddatum kan niet vóór de startdatum liggen.");
      return;
    }

    setSaving(true);
    const updated = await updateTrip(activeTrip.id, {
      name: name.trim(),
      destination_name: destination.trim() || null,
      destination_country: country.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      group_size: Math.max(1, Number.parseInt(groupSize, 10) || 1),
      currency,
      timezone: activeTrip.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      description: description.trim() || null,
    });
    setSaving(false);

    if (!updated) {
      setError("De wijzigingen konden niet worden opgeslagen.");
      return;
    }
    setSaved(true);

    // Offer to move items that now fall outside the new trip dates along with the trip.
    const oldStart = activeTrip.start_date;
    if (oldStart && startDate && endDate && (oldStart !== startDate || activeTrip.end_date !== endDate)) {
      const items = await listTripItems(activeTrip.id).catch(() => []);
      const outside = itemsOutsideTrip(items, startDate, endDate);
      const n = outside.length;
      const [fromDate, toDate] = dateShiftAnchor(oldStart, startDate, activeTrip.end_date, endDate);
      if (n > 0 && fromDate !== toDate && window.confirm(`Wil je ${n} ${n === 1 ? "onderdeel" : "onderdelen"} meeschuiven met je nieuwe reisdata?`)) {
        const results = await Promise.all(outside.map((item) =>
          supabase.from("trip_items").update(shiftItemDates(item, fromDate, toDate)).eq("id", item.id).eq("trip_id", activeTrip.id),
        ));
        if (results.some((r) => r.error)) setError("Niet alle onderdelen konden worden verschoven.");
        await queryClient.invalidateQueries({ queryKey: ["trip-items", activeTrip.id] });
      }
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Deze reis archiveren? Je gegevens blijven bewaard.")) return;
    setLifecycleBusy(true);
    const ok = await archiveTrip(activeTrip.id);
    setLifecycleBusy(false);
    if (ok) navigate("/trips", { replace: true });
    else setError("Archiveren is niet gelukt.");
  };

  const handleRestore = async () => {
    setLifecycleBusy(true);
    const ok = await restoreTrip(activeTrip.id);
    setLifecycleBusy(false);
    if (!ok) setError("Herstellen is niet gelukt.");
  };

  return (
    <AppLayout><div className="mx-auto max-w-xl px-5 pt-4 pb-4">
      <div className="hidden md:block"><PageHeader title="Reisinstellingen" /></div>
      <Button asChild variant="ghost" className="mb-3 px-0"><Link to={`/trip/${activeTrip.id}/reis`}><ArrowLeft />Reis</Link></Button>
      <div className="grid grid-cols-2 gap-3">
        {([
          { key: "naam", label: "Naam", value: name, icon: Settings },
          { key: "bestemming", label: "Bestemming", value: destination || "Niet ingevuld", icon: MapPin },
          { key: "data", label: "Reisdata", value: startDate ? new Date(`${startDate}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) : "Niet ingevuld", icon: CalendarDays },
          { key: "reizigers", label: "Reizigers en valuta", value: `${groupSize} · ${currency}`, icon: Users },
          { key: "notitie", label: "Notitie", value: description || "Geen notitie", icon: StickyNote },
          { key: "archief", label: activeTrip.status === "archived" ? "Herstellen" : "Archiveren", value: "", icon: Archive },
        ] as const).map((tile) => <Button key={tile.key} variant="secondary" onClick={() => { setPanel(tile.key); setSaved(false); setError(""); }} className="tile-plain h-24 min-w-0 flex-col items-start justify-center rounded-2xl px-4 text-left">
          <span className="flex items-center gap-2 text-base"><tile.icon />{tile.label}</span>
          {tile.value && <span className="block w-full truncate text-sm font-normal text-muted-foreground">{tile.value}</span>}
        </Button>)}
      </div>
      <FormSheet open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }} title={panel === "naam" ? "Naam" : panel === "bestemming" ? "Bestemming" : panel === "data" ? "Reisdata" : panel === "reizigers" ? "Reizigers en valuta" : panel === "notitie" ? "Notitie" : "Archief"}>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {panel === "naam" && <div>
          <label className="text-sm font-semibold" htmlFor="settings-name">Naam *</label>
          <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-12" />
        </div>}

        {panel === "bestemming" && <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold" htmlFor="settings-destination">Bestemming</label>
            <Input id="settings-destination" value={destination} onChange={(event) => setDestination(event.target.value)} className="mt-2 h-12" />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="settings-country">Land</label>
            <Input id="settings-country" value={country} onChange={(event) => setCountry(event.target.value)} className="mt-2 h-12" />
          </div>
        </div>}

        {panel === "data" && <div className="grid min-w-0 grid-cols-2 gap-3 [&_input]:min-w-0 [&_input]:max-w-full">
          <div>
            <label className="text-sm font-semibold" htmlFor="settings-start">Van</label>
            <Input id="settings-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 h-12" />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="settings-end">Tot</label>
            <Input id="settings-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 h-12" />
          </div>
        </div>}

        {panel === "reizigers" && <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold" htmlFor="settings-group">Aantal reizigers</label>
            <Input id="settings-group" type="number" min={1} max={99} value={groupSize} onChange={(event) => setGroupSize(event.target.value)} className="mt-2 h-12" />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="settings-currency">Valuta</label>
            <select
              id="settings-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>}

        {panel === "notitie" && <div>
          <label className="text-sm font-semibold" htmlFor="settings-description">Notitie</label>
          <Textarea id="settings-description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2" rows={3} />
        </div>}

        {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
        {saved && <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm font-medium text-primary">Opgeslagen.</p>}

        {panel !== "archief" && <FormSubmit saving={saving || lifecycleBusy}><Save />Opslaan</FormSubmit>}
      </form>

      {panel === "archief" && <div className="py-5">
        <h2 className="font-display text-lg font-extrabold">Archief</h2>
        <p className="mt-1 text-sm text-muted-foreground">Archiveren verwijdert niets. Je kunt de reis later weer herstellen.</p>

        {activeTrip.status === "archived" ? (
          <Button type="button" variant="outline" className="mt-5" onClick={handleRestore} disabled={lifecycleBusy}>
            <RotateCcw className="mr-2 h-4 w-4" />Reis herstellen
          </Button>
        ) : (
          <Button type="button" variant="outline" className="mt-5" onClick={handleArchive} disabled={lifecycleBusy}>
            <Archive className="mr-2 h-4 w-4" />Reis archiveren
          </Button>
        )}
      </div>}
      </FormSheet>
    </div></AppLayout>
  );
}
