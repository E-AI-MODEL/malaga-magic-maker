import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ExternalLink, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
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

export default function TripReis() {
  const { user } = useAuth();
  const { activeTrip, isOrganizer } = useTrip();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItemRow | null>(null);
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

  const refreshItems = async () => {
    await queryClient.invalidateQueries({ queryKey: ["trip-items", activeTrip.id] });
  };

  const openCreate = () => {
    setEditingItem(null);
    setActionError("");
    setSheetOpen(true);
  };

  const openEdit = (item: TripItemRow) => {
    setEditingItem(item);
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reis</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Van vertrek tot aankomst</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Vervoer, verblijf, reserveringen en activiteiten staan hier in de volgorde waarin ze gebeuren.
            </p>
          </div>
          {!readOnly && (
            <Button onClick={openCreate} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Toevoegen</span><span className="sm:hidden">Nieuw</span>
            </Button>
          )}
        </div>

        {readOnly && (
          <div className="mt-5 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
            Deze reis staat in het archief. Herstel de reis via Reisinstellingen om onderdelen te wijzigen.
          </div>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-primary" />Periode</div>
            <p className="mt-2 text-sm text-muted-foreground">{formatDateRange(activeTrip.start_date, activeTrip.end_date)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" />Bestemming</div>
            <p className="mt-2 text-sm text-muted-foreground">{activeTrip.destination_name || "Nog niet ingevuld"}</p>
          </div>
        </div>

        {actionError && <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{actionError}</p>}

        <div className="mt-8">
          {itemsQuery.isLoading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />)}
            </div>
          ) : itemsQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">Je reisgegevens konden niet worden geladen.</div>
          ) : groups.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-6 text-center">
              <div className="mb-4 text-4xl">🧭</div>
              <h2 className="font-display text-xl font-extrabold">Nog niets op je tijdlijn</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Voeg toe wat al vaststaat of wat je wilt onthouden. Je hoeft niet alles in één keer te weten.
              </p>
              {!readOnly && <Button onClick={openCreate} className="mt-5"><Plus className="mr-2 h-4 w-4" />Eerste onderdeel toevoegen</Button>}
            </div>
          ) : (
            <div className="space-y-8">
              {groups.map(([day, items]) => (
                <section key={day}>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{formatTripDay(day, timezone)}</h2>
                  <div className="space-y-3">
                    {items.map((item) => {
                      const type = getTravelType(item.type);
                      const canEdit = !readOnly && (isOrganizer || item.created_by === user?.id);
                      const displayTimezone = item.timezone || timezone;
                      return (
                        <article key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-xl">{type.icon}</div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">{type.label} · {getTravelStatus(item.status)}</p>
                                  <h3 className="mt-1 font-display text-lg font-extrabold leading-tight">{item.title}</h3>
                                </div>
                                {canEdit && (
                                  <div className="flex shrink-0 gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)} aria-label="Wijzigen"><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void handleDelete(item)} aria-label="Verwijderen"><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                                {item.start_at && <p>{formatTripDateTime(item.start_at, displayTimezone)}{item.end_at ? ` → ${formatTripDateTime(item.end_at, displayTimezone)}` : ""}</p>}
                                {item.location_name && <p>📍 {item.location_name}</p>}
                                {item.provider && <p>{item.provider}{item.booking_reference ? ` · ${item.booking_reference}` : ""}</p>}
                                {item.price != null && <p>{new Intl.NumberFormat("nl-NL", { style: "currency", currency: item.currency || currency }).format(item.price)}</p>}
                                {item.notes && <p className="pt-1 leading-relaxed text-foreground/75">{item.notes}</p>}
                                {item.booking_url && (
                                  <a href={item.booking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 pt-1 font-medium text-primary hover:underline">
                                    Boekingslink <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
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
        </div>

        <DocumentsSection
          tripId={activeTrip.id}
          items={itemsQuery.data || []}
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
        onSaved={refreshItems}
      />
    </AppLayout>
  );
}
