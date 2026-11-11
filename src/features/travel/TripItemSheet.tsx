import { FormEvent, ReactNode, useEffect, useState } from "react";
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
import { ChevronRight, MapPin, Pencil } from "lucide-react";
import { StepError, StepNext, StepQuestion, StepSheet, StepSummary, StepTile, useStepFlow } from "@/components/steps";
import { travelTypeIcon } from "./icons";
import { currentMapsPlatform, mapsUrl } from "./maps";

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
  destination?: string | null;
};

const currencies = ["EUR", "USD", "GBP", "CHF"];

export function TripItemSheet({ open, onOpenChange, tripId, timezone, currency, item, initialType, onSaved, onDelete, destination }: Props) {
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
    flow.reset();
  // Reset only when opening another record, not while moving through its steps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
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
  const creationSteps = ["type", "title", "status", "when", "location", ...(detailFieldsFor(type).length ? ["details"] : []), "booking", "price", "notes", "summary"];
  const datesValid = !(startAt && endAt && endAt < startAt);
  const flow = useStepFlow(creationSteps, { title: Boolean(title.trim()), when: datesValid }, "summary");
  const [editSection, setEditSection] = useState("title");
  const skip = () => {
    if (flow.step === "title") setTitle(selectedType?.label || "Reisonderdeel");
    if (flow.step === "when") { setStartAt(""); setEndAt(""); }
    if (flow.step === "location") setLocation("");
    if (flow.step === "details") setDetails({});
    if (flow.step === "booking") { setProvider(""); setBookingReference(""); setBookingUrl(""); }
    if (flow.step === "price") setPrice("");
    if (flow.step === "notes") setNotes("");
    flow.go(flow.backToSummary ? "summary" : creationSteps[Math.min(flow.index + 1, creationSteps.length - 1)]);
  };
  const fields: Record<string, ReactNode> = {
    title: <FormField label="Naam" htmlFor="travel-title"><Input id="travel-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={selectedType?.label || "Naam"} maxLength={200} className="h-14 rounded-2xl text-lg" /></FormField>,
    type: <div className="grid grid-cols-2 gap-3">{travelTypes.map((option) => {
      const Icon = travelTypeIcon(option.value);
      return <StepTile key={option.value} selected={type === option.value} icon={<Icon />} onClick={() => { setType(option.value); if (!item) flow.next(); }}>{option.label}</StepTile>;
    })}</div>,
    status: <div className="grid grid-cols-2 gap-3">{travelStatuses.map((option) => <StepTile key={option.value} selected={status === option.value} onClick={() => { setStatus(option.value); if (!item) flow.next(); }}>{option.label}</StepTile>)}</div>,
    when: <><div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      <FormField label="Begin" htmlFor="travel-start" className="min-w-0"><Input id="travel-start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="h-14 min-w-0 w-full rounded-2xl" /></FormField>
      <FormField label="Einde" htmlFor="travel-end" className="min-w-0"><Input id="travel-end" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="h-14 min-w-0 w-full rounded-2xl" /></FormField>
    </div>{!datesValid && <StepError message="Het einde ligt vóór het begin." />}</>,
    location: <FormField label="Plaats of adres" htmlFor="travel-location"><Input id="travel-location" value={location} onChange={(e) => setLocation(e.target.value)} className="h-14 rounded-2xl" /></FormField>,
    details: <div className="grid gap-3">{detailFieldsFor(type).map((field) => <FormField key={field.key} label={field.label} htmlFor={`travel-detail-${field.key}`}><Input id={`travel-detail-${field.key}`} value={details[field.key] || ""} onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))} placeholder={field.placeholder} maxLength={200} className="h-14 rounded-2xl" /></FormField>)}</div>,
    booking: <div className="space-y-3">
      <FormField label="Aanbieder" htmlFor="travel-provider"><Input id="travel-provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="h-14 rounded-2xl" /></FormField>
      <FormField label="Boekingsnummer" htmlFor="travel-reference"><Input id="travel-reference" value={bookingReference} onChange={(e) => setBookingReference(e.target.value)} className="h-14 rounded-2xl" /></FormField>
      <FormField label="Boekingslink" htmlFor="travel-url"><Input id="travel-url" type="url" value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="https://..." className="h-14 rounded-2xl" /></FormField>
    </div>,
    price: <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
      <FormField label="Bedrag" htmlFor="travel-price"><Input id="travel-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="h-14 rounded-2xl" /></FormField>
      <FormField label="Valuta" htmlFor="travel-currency"><FormSelect id="travel-currency" value={itemCurrency} onChange={setItemCurrency} options={currencies.map((value) => ({ value, label: value }))} /></FormField>
    </div>,
    notes: <FormField label="Notitie" htmlFor="travel-notes"><Textarea id="travel-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-2xl" /></FormField>,
  };
  const headings: Record<string, string> = { type: "Kies wat je toevoegt", title: "Geef het een naam", status: "Kies de status", when: "Kies datum en tijd", location: "Vul de locatie in", details: "Vul de details in", booking: "Vul de boeking in", price: "Vul het bedrag in", notes: "Schrijf een notitie" };
  const summaries = [
    { key: "title", label: "Naam", value: title || selectedType?.label || "Reisonderdeel" },
    { key: "type", label: "Soort", value: selectedType?.label || "Anders" },
    { key: "status", label: "Status", value: travelStatuses.find((s) => s.value === status)?.label || status },
    { key: "when", label: "Datum en tijd", value: [startAt, endAt].filter(Boolean).map((v) => v.replace("T", " · ")).join(" — ") || "Later" },
    { key: "location", label: "Locatie", value: location || "Later" },
    ...(detailFieldsFor(type).length ? [{ key: "details", label: "Details", value: detailFieldsFor(type).map((f) => details[f.key]).filter(Boolean).join(" · ") || "Later" }] : []),
    { key: "booking", label: "Boeking", value: [provider, bookingReference, bookingUrl].filter(Boolean).join(" · ") || "Later" },
    { key: "price", label: "Bedrag", value: price ? `${price} ${itemCurrency}` : "Prijs nog onbekend" },
    { key: "notes", label: "Notitie", value: notes || "Later" },
  ];

  if (!item) return <StepSheet open={open} onOpenChange={onOpenChange} title="Toevoegen aan Reis" total={creationSteps.length} index={flow.index} onBack={flow.back} onSwipeNext={flow.step !== "summary" ? flow.next : undefined} hint={false}>
    {flow.step === "summary" ? <>
      <StepQuestion>Check en sla op</StepQuestion>
      <StepSummary rows={summaries.map((s) => ({ ...s, onEdit: () => flow.edit(s.key) }))} />
      <StepError message={error} />
      <StepNext onClick={() => void handleSubmit()} busy={saving} disabled={!flow.complete} done>Opslaan</StepNext>
    </> : <>
      <StepQuestion>{headings[flow.step]}</StepQuestion>
      <Button type="button" variant="secondary" className="tile-plain mb-5 min-h-12 w-full" onClick={skip}>Sla over</Button>
      <form onSubmit={(e) => { e.preventDefault(); flow.next(); }}>
        {fields[flow.step]}
        {!['type', 'status'].includes(flow.step) && <StepNext disabled={flow.step === "title" ? !title.trim() : flow.step === "when" ? !datesValid : false}>{flow.backToSummary ? "Klaar" : "Volgende"}</StepNext>}
      </form>
    </>}
  </StepSheet>;

  return <FormSheet open={open} onOpenChange={onOpenChange} title={item.title}>
    {(() => { const href = mapsUrl(item, destination, currentMapsPlatform()); return href ? <Button asChild variant="secondary" className="tile-plain mt-4 w-full"><a href={href} target="_blank" rel="noopener noreferrer"><MapPin />Open in Kaarten</a></Button> : null; })()}
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      {summaries.map((section) => <div key={section.key}>
        <Button type="button" variant="secondary" aria-expanded={editSection === section.key} className="tile-plain min-h-16 w-full justify-start gap-3 px-4 text-left" onClick={() => setEditSection(editSection === section.key ? "" : section.key)}>
          <span className="min-w-0 flex-1"><span className="block text-sm text-muted-foreground">{section.label}</span><span className="block truncate text-base font-semibold">{section.value}</span></span>{editSection === section.key ? <Pencil /> : <ChevronRight />}
        </Button>
        {editSection === section.key && <div className="pb-2 pt-5">{fields[section.key]}</div>}
      </div>)}
      {linkedDocs.map((doc) => <Button key={doc.id} type="button" variant="secondary" className="tile-plain w-full justify-start" onClick={() => void openDocument(doc)}>{doc.filename}</Button>)}
      {item.price != null && Number(item.price) > 0 && (existingExpenseId || expenseState === "done" ? <p className="text-sm text-muted-foreground">Dit bedrag staat in Knaakie.</p> : <Button type="button" variant="secondary" className="tile-plain min-h-14 w-full" disabled={expenseState === "busy"} onClick={() => void addAsExpense()}>{expenseState === "busy" ? "Bezig…" : "Toevoegen aan Knaakie"}</Button>)}
      <FormError message={error} />
      <FormSubmit saving={saving}>Opslaan</FormSubmit>
      {onDelete && <Button type="button" variant="ghost" className="w-full text-destructive" disabled={deleting || saving} onClick={() => void handleDelete()}>{deleting ? "Verwijderen…" : "Verwijderen"}</Button>}
    </form>
  </FormSheet>;
}
