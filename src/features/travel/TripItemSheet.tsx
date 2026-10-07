import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormSelect, FormSheet, FormSubmit } from "@/components/FormSheet";
import { createTripItem, TripItemRow, updateTripItem } from "./data";
import { detailFieldsFor, isoToLocalInput, localInputToIso, mergeDetails, readDetails, travelStatuses, travelTypes } from "./presentation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { createExpenseWithSplits, listTripMembers } from "@/features/together/data";
import { splitEvenly } from "@/features/together/money";
import { createTripDocumentSignedUrl, listTripDocuments } from "@/features/documents/data";
import type { Json } from "@/integrations/supabase/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  timezone: string;
  currency: string;
  item?: TripItemRow | null;
  initialType?: string;
  onSaved: () => void | Promise<void>;
  /** Optional destructive action. Lives in the detail form, never on every timeline row. */
  onDelete?: (item: TripItemRow) => void | Promise<void>;
};

const currencies = ["EUR", "USD", "GBP", "CHF"];

export function TripItemSheet({ open, onOpenChange, tripId, timezone, currency, item, initialType, onSaved, onDelete }: Props) {
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
  const [deleting, setDeleting] = useState(false);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [expenseState, setExpenseState] = useState<"idle" | "busy" | "done">("idle");
  const { user } = useAuth();
  const docs = useQuery({
    queryKey: ["trip-documents", tripId],
    queryFn: () => listTripDocuments(tripId),
    enabled: open && Boolean(item),
  });
  const linkedDocs = (docs.data || []).filter((d) => item && d.trip_item_id === item.id && d.status === "ready");
  const existingExpenseId = item ? readDetails(item.metadata).expense_id : undefined;

  const openDocument = async (doc: (typeof linkedDocs)[number]) => {
    try {
      const url = await createTripDocumentSignedUrl(doc);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Document openen is niet gelukt.");
    }
  };

  const addAsExpense = async () => {
    if (!item || !user || item.price == null || Number(item.price) <= 0) return;
    setExpenseState("busy");
    setError("");
    try {
      const members = await listTripMembers(tripId);
      const ids = members.map((m) => m.userId);
      const amount = Number(item.price);
      const expenseId = await createExpenseWithSplits(tripId, {
        description: item.title,
        amount,
        paidByUserId: user.id,
        currency: item.currency || currency || "EUR",
        splits: splitEvenly(amount, ids.length ? ids : [user.id]),
      });
      const base = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? item.metadata : {};
      await updateTripItem(tripId, item.id, { metadata: { ...base, expense_id: String(expenseId) } as Json });
      setExpenseState("done");
      await onSaved();
    } catch (caught) {
      console.error("add expense failed", caught);
      setError("Toevoegen aan Kosten is niet gelukt.");
      setExpenseState("idle");
    }
  };

  useEffect(() => {
    if (!open) return;
    setType(item?.type || initialType || "custom");
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
    setDeleting(false);
    setDetails(readDetails(item?.metadata));
    setExpenseState("idle");
  }, [open, item, initialType, timezone, currency]);

  const handleDelete = async () => {
    if (!item || !onDelete) return;
    if (!window.confirm(`'${item.title}' verwijderen uit je reis?`)) return;
    setDeleting(true);
    try {
      await onDelete(item);
      onOpenChange(false);
    } catch (caught) {
      console.error("trip item delete failed", caught);
      setError("Verwijderen is niet gelukt.");
    } finally {
      setDeleting(false);
    }
  };

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
        metadata: mergeDetails(item?.metadata, type, details) as Json,
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

  const selectedType = travelTypes.find((option) => option.value === type);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Reisonderdeel wijzigen" : selectedType ? `${selectedType.label} toevoegen` : "Toevoegen aan je reis"}
      description="Vul in wat je weet; de rest kan later."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Soort" htmlFor="travel-type">
            <FormSelect
              id="travel-type"
              value={type}
              onChange={setType}
              options={travelTypes.map((option) => ({ value: option.value, label: option.label }))}
            />
          </FormField>
          <FormField label="Hoe staat het ervoor?" htmlFor="travel-status">
            <FormSelect
              id="travel-status"
              value={status}
              onChange={setStatus}
              options={travelStatuses.map((option) => ({ value: option.value, label: option.label }))}
            />
          </FormField>
        </div>

        <FormField label="Korte naam" htmlFor="travel-title" required>
          <Input id="travel-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bijv. Vlucht naar Rome" className="h-11" autoFocus />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Begin" htmlFor="travel-start">
            <Input id="travel-start" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className="h-11" />
          </FormField>
          <FormField label="Einde" htmlFor="travel-end">
            <Input id="travel-end" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} className="h-11" />
          </FormField>
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">Tijden worden opgeslagen in de tijdzone van deze reis.</p>

        <FormField label="Waar?" htmlFor="travel-location">
          <Input id="travel-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Plaats, luchthaven, adres of locatie" className="h-11" />
        </FormField>

        {detailFieldsFor(type).length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {detailFieldsFor(type).map((field) => (
              <FormField key={field.key} label={field.label} htmlFor={`travel-detail-${field.key}`}>
                <Input
                  id={`travel-detail-${field.key}`}
                  value={details[field.key] || ""}
                  onChange={(event) => setDetails((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  maxLength={200}
                  className="h-11"
                />
              </FormField>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Bij wie?" htmlFor="travel-provider">
            <Input id="travel-provider" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Bijv. KLM of Hertz" className="h-11" />
          </FormField>
          <FormField label="Boekingsnummer" htmlFor="travel-reference">
            <Input id="travel-reference" value={bookingReference} onChange={(event) => setBookingReference(event.target.value)} className="h-11" />
          </FormField>
        </div>

        <FormField label="Boekingslink" htmlFor="travel-url">
          <Input id="travel-url" type="url" value={bookingUrl} onChange={(event) => setBookingUrl(event.target.value)} placeholder="https://..." className="h-11" />
        </FormField>

        <div className="grid grid-cols-[1fr_110px] gap-3">
          <FormField label="Bedrag" htmlFor="travel-price">
            <Input id="travel-price" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="h-11" />
          </FormField>
          <FormField label="Valuta" htmlFor="travel-currency">
            <FormSelect
              id="travel-currency"
              value={itemCurrency}
              onChange={setItemCurrency}
              options={currencies.map((option) => ({ value: option, label: option }))}
            />
          </FormField>
        </div>

        <FormField label="Notitie" htmlFor="travel-notes">
          <Textarea id="travel-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Alleen wat handig is om bij dit onderdeel te onthouden" />
        </FormField>

        {item && linkedDocs.length > 0 && (
          <div>
            <p className="text-sm font-semibold">Documenten bij dit onderdeel</p>
            <div className="mt-2 divide-y divide-rule border-y border-rule">
              {linkedDocs.map((doc) => (
                <button key={doc.id} type="button" onClick={() => void openDocument(doc)} className="block w-full truncate py-2.5 text-left text-sm font-medium underline-offset-2 hover:underline">
                  {doc.filename}
                </button>
              ))}
            </div>
          </div>
        )}

        {item && item.price != null && Number(item.price) > 0 && (
          existingExpenseId || expenseState === "done" ? (
            <p className="text-sm text-muted-foreground">Dit bedrag staat al bij Samen &gt; Kosten.</p>
          ) : (
            <Button type="button" variant="outline" className="h-11 w-full" disabled={expenseState === "busy"} onClick={() => void addAsExpense()}>
              {expenseState === "busy" ? "Bezig…" : "Bedrag als kosten toevoegen (gelijk verdeeld)"}
            </Button>
          )
        )}

        <FormError message={error} />

        <FormSubmit saving={saving}>{item ? "Wijzigingen opslaan" : "Toevoegen aan reisplan"}</FormSubmit>

        {item && onDelete && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || saving}
            className="w-full py-2 text-center text-sm font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-60"
          >
            {deleting ? "Verwijderen…" : "Dit onderdeel verwijderen"}
          </button>
        )}
      </form>
    </FormSheet>
  );
}
