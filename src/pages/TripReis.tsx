import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ExternalLink, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { deleteTripItem, listTripItems, TripItemRow } from "@/features/travel/data";
import { TripItemSheet } from "@/features/travel/TripItemSheet";
import { DocumentsSection } from "@/features/documents/DocumentsSection";
import {
  formatTripDateTime,
  formatTripDay,
  getTravelStatus,
  getTravelType,
  tripDayKey,
} from "@/features/travel/presentation";

const quickAddTypes = ["flight", "train", "stay", "activity", "custom"] as const;

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Data nog niet gekozen";
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  return format(startDate || endDate || "");
}

function statusTone(status: string) {
  if (status === "confirmed") return "border-primary/20 bg-primary/10 text-primary";
  if (status === "completed") return "border-border bg-secondary text-muted-foreground";
  if (status === "cancelled") return "border-destructive/20 bg-destructive/5 text-destructive";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300";
}

export default function TripReis() {
  const { user } = useAuth();
  const { activeTrip, isOrganizer } = useTrip();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItemRow | null>(null);
  const [createType, setCreateType] = useState<string>("custom");
  const [actionError, setActionError] = useState("");

  const tripId = activeTrip?.id || "";
  const timezone = activeTrip?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam";
  const currency = activeTrip?.currency || "EUR";
  const readOnly = activeTrip?.status === "archived";

  const itemsQuery = useQuery({
    queryKey: ["trip-items", tripId],
    queryFn: () => listTripItems(tripId),
    enabled: Boolean(tripId),
  });

  const groups = useMemo(() => {
    const grouped = new Map<string, TripItemRow[]>();
    for (const item of itemsQuery.data || []) {
      const key = tripDayKey(item.start_at, item.timezone || timezone);
      grouped.set(key, [...(grouped.get(key) || []), item]);
    }

    return [...grouped.entries()].sort(([a], [b]) => {
      if (a === "undated") return 1;
      if (b === "undated") return -1;
      return a.localeCompare(b);
    });
  }, [itemsQuery.data, timezone]);

  if (!activeTrip) return null;

  const items = itemsQuery.data || [];
  const confirmedCount = items.filter((item) => item.status === "confirmed").length;
  const attentionCount = items.filter((item) => item.status === "planned").length;

  const refreshItems = async () => {
    await queryClient.invalidateQueries({ queryKey: ["trip-items", activeTrip.id] });
  };

  const openCreate = (type = "custom") => {
    setEditingItem(null);
    setCreateType(type);
    setActionError("");
    setSheetOpen(true);
  };

  const openEdit = (item: TripItemRow) => {
    setEditingItem(item);
    setCreateType("custom");
    setActionError("");
    setSheetOpen(true);
  };

  const handleDelete = async (item: TripItemRow) => {
    if (!window.confirm(`'${item.title}' verwijderen uit je reis?`)) return;
    setActionError("");
    try {
      await deleteTripItem(activeTrip.id, item.id);
      await refreshItems();
    } catch (error) {
      console.error("trip item delete failed", error);
      setActionError("Verwijderen is niet gelukt.");
    }
  };

  return (
    <AppLayout>
      <div className="px-5 py-7 sm:px-8 sm:py-10">
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reisplan</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Alles in de volgorde van je reis</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Zet vervoer, verblijf, activiteiten en reserveringen op één tijdlijn. Voeg alleen toe wat voor jouw reis relevant is.
              </p>
            </div>
            {!readOnly && (
              <Button onClick={() => openCreate()} className="hidden shrink-0 sm:inline-flex">
                <Plus className="mr-2 h-4 w-4" />Toevoegen
              </Button>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />{formatDateRange(activeTrip.start_date, activeTrip.end_date)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />{activeTrip.destination_name || "Bestemming nog niet ingevuld"}
            </span>
          </div>

          {!itemsQuery.isLoading && (
            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border pt-5">
              <div>
                <p className="font-display text-2xl font-extrabold">{items.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">in je reisplan</p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-primary">{confirmedCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">bevestigd</p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold">{attentionCount}</p>
                <p className="mt-1 text-xs text-muted-foreground">nog te regelen</p>
              </div>
            </div>
          )}
        </section>

        {readOnly ? (
          <div className="mt-5 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
            Deze reis staat in het archief. Herstel de reis via Reisinstellingen om onderdelen te wijzigen.
          </div>
        ) : (
          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-extrabold">Wat wil je toevoegen?</h2>
                <p className="mt-1 text-xs text-muted-foreground">Kies een startpunt. Je vult daarna zelf de details in.</p>
              </div>
            </div>
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
              {quickAddTypes.map((value) => {
                const type = getTravelType(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => openCreate(value)}
                    className="min-w-[112px] rounded-2xl border border-border bg-card px-3 py-4 text-left transition-colors hover:border-primary/30 sm:min-w-0"
                  >
                    <span className="text-2xl" aria-hidden="true">{type.icon}</span>
                    <span className="mt-2 block text-sm font-bold">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {actionError && <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{actionError}</p>}

        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tijdlijn</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold">Je reis van dag tot dag</h2>
            </div>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => openCreate()} className="sm:hidden">
                <Plus className="mr-1 h-4 w-4" />Toevoegen
              </Button>
            )}
          </div>

          {itemsQuery.isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />)}
            </div>
          ) : itemsQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">Je reisgegevens konden niet worden geladen.</div>
          ) : groups.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-6 text-center">
              <div className="mb-4 text-4xl" aria-hidden="true">🧭</div>
              <h3 className="font-display text-xl font-extrabold">Je reisplan is nog leeg</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Begin bijvoorbeeld met je vervoer of verblijf. Wat nog niet vaststaat, mag gewoon op “Nog te regelen”.
              </p>
              {!readOnly && <Button onClick={() => openCreate()} className="mt-5"><Plus className="mr-2 h-4 w-4" />Eerste onderdeel toevoegen</Button>}
            </div>
          ) : (
            <div className="space-y-9">
              {groups.map(([day, dayItems]) => (
                <section key={day}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <h3 className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{formatTripDay(day, timezone)}</h3>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-3">
                    {dayItems.map((item) => {
                      const type = getTravelType(item.type);
                      const canEdit = !readOnly && (isOrganizer || item.created_by === user?.id);
                      const displayTimezone = item.timezone || timezone;
                      return (
                        <article key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl" aria-hidden="true">{type.icon}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{type.label}</span>
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(item.status)}`}>
                                      {getTravelStatus(item.status)}
                                    </span>
                                  </div>
                                  <h4 className="mt-1.5 font-display text-lg font-extrabold leading-tight">{item.title}</h4>
                                </div>
                                {canEdit && (
                                  <div className="flex shrink-0 gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} aria-label="Wijzigen"><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void handleDelete(item)} aria-label="Verwijderen"><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                                {item.start_at && <p className="font-medium text-foreground/80">{formatTripDateTime(item.start_at, displayTimezone)}{item.end_at ? ` → ${formatTripDateTime(item.end_at, displayTimezone)}` : ""}</p>}
                                {item.location_name && <p>📍 {item.location_name}</p>}
                                {item.provider && <p>{item.provider}{item.booking_reference ? ` · ${item.booking_reference}` : ""}</p>}
                                {item.price != null && <p>{new Intl.NumberFormat("nl-NL", { style: "currency", currency: item.currency || currency }).format(item.price)}</p>}
                                {item.notes && <p className="pt-1 leading-relaxed text-foreground/75">{item.notes}</p>}
                                {item.booking_url && (
                                  <a href={item.booking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 pt-1 font-medium text-primary hover:underline">
                                    Open boeking <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>

                              {item.status === "confirmed" && (
                                <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
                                  <CheckCircle2 className="h-3.5 w-3.5" />Staat vast in je reisplan
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <DocumentsSection
          tripId={activeTrip.id}
          items={items}
          currentUserId={user?.id}
          isOrganizer={isOrganizer}
          readOnly={readOnly}
        />
      </div>

      <TripItemSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tripId={activeTrip.id}
        timezone={timezone}
        currency={currency}
        item={editingItem}
        initialType={editingItem ? undefined : createType}
        onSaved={refreshItems}
      />
    </AppLayout>
  );
}
