import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createTripItem, TripItemRow, updateTripItem } from "./data";
import { isoToLocalInput, localInputToIso, travelStatuses, travelTypes } from "./presentation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  timezone: string;
  currency: string;
  item?: TripItemRow | null;
  onSaved: () => void | Promise<void>;
};

const currencies = ["EUR", "USD", "GBP", "CHF"];

export function TripItemSheet({ open, onOpenChange, tripId, timezone, currency, item, onSaved }: Props) {
  const [type, setType] = useState("custom");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("planned");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [provider, setProvider] = useState("");
  const [bookingReference, setBookingReference] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [price, setPrice] = useState("");
  const [itemCurrency, setItemCurrency] = useState(currency || "EUR");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setType(item?.type || "custom");
    setTitle(item?.title || "");
    setStatus(item?.status || "planned");
    setStartAt(isoToLocalInput(item?.start_at || null, timezone));
    setEndAt(isoToLocalInput(item?.end_at || null, timezone));
    setLocation(item?.location_name || "");
    setProvider(item?.provider || "");
    setBookingReference(item?.booking_reference || "");
    setBookingUrl(item?.booking_url || "");
    setPrice(item?.price == null ? "" : String(item.price));
    setItemCurrency(item?.currency || currency || "EUR");
    setNotes(item?.notes || "");
    setError("");
  }, [open, item, timezone, currency]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Geef dit reisonderdeel een korte naam.");
      return;
    }
    if (startAt && endAt && endAt < startAt) {
      setError("Het eindmoment kan niet vóór het begin liggen.");
      return;
    }

    setSaving(true);
    try {
      const values = {
        type,
        title: title.trim(),
        status,
        start_at: localInputToIso(startAt, timezone),
        end_at: localInputToIso(endAt, timezone),
        timezone,
        location_name: location.trim() || null,
        provider: provider.trim() || null,
        booking_reference: bookingReference.trim() || null,
        booking_url: bookingUrl.trim() || null,
        price: price === "" ? null : Number(price),
        currency: itemCurrency,
        notes: notes.trim() || null,
      };

      if (item) {
        await updateTripItem(tripId, item.id, values);
      } else {
        await createTripItem({ trip_id: tripId, ...values });
      }

      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      console.error("trip item save failed", caught);
      setError("Opslaan is niet gelukt. Controleer de gegevens en probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-5 pb-8 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl font-extrabold">{item ? "Reisonderdeel wijzigen" : "Toevoegen aan je reis"}</SheetTitle>
          <SheetDescription>Vul alleen in wat je al weet. Je kunt dit later altijd aanvullen.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold" htmlFor="travel-type">Soort</label>
              <select id="travel-type" value={type} onChange={(event) => setType(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                {travelTypes.map((option) => <option key={option.value} value={option.value}>{option.icon} {option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="travel-status">Status</label>
              <select id="travel-status" value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                {travelStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="travel-title">Naam *</label>
            <Input id="travel-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bijv. Vlucht naar Rome" className="mt-2 h-11" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold" htmlFor="travel-start">Begin</label>
              <Input id="travel-start" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className="mt-2 h-11" />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="travel-end">Einde</label>
              <Input id="travel-end" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} className="mt-2 h-11" />
            </div>
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">Tijden worden opgeslagen in de tijdzone van deze reis.</p>

          <div>
            <label className="text-sm font-semibold" htmlFor="travel-location">Locatie</label>
            <Input id="travel-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Plaats, luchthaven, adres of locatie" className="mt-2 h-11" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold" htmlFor="travel-provider">Aanbieder</label>
              <Input id="travel-provider" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Bijv. KLM of Hertz" className="mt-2 h-11" />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="travel-reference">Boekingsnummer</label>
              <Input id="travel-reference" value={bookingReference} onChange={(event) => setBookingReference(event.target.value)} className="mt-2 h-11" />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="travel-url">Boekingslink</label>
            <Input id="travel-url" type="url" value={bookingUrl} onChange={(event) => setBookingUrl(event.target.value)} placeholder="https://..." className="mt-2 h-11" />
          </div>

          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div>
              <label className="text-sm font-semibold" htmlFor="travel-price">Bedrag</label>
              <Input id="travel-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-2 h-11" />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="travel-currency">Valuta</label>
              <select id="travel-currency" value={itemCurrency} onChange={(event) => setItemCurrency(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                {currencies.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold" htmlFor="travel-notes">Notitie</label>
            <Textarea id="travel-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2" placeholder="Alleen wat handig is om bij dit onderdeel te onthouden" />
          </div>

          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" className="h-12 w-full font-bold" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {item ? "Wijzigingen opslaan" : "Toevoegen"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
