import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BedDouble,
  Bus,
  CarFront,
  ChevronRight,
  ExternalLink,
  MapPinned,
  Plane,
  Plus,
  Route,
  Ship,
  Ticket,
  TrainFront,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/primitives";
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

const typeIcons: Record<string, typeof Route> = {
  flight: Plane,
  train: TrainFront,
  ferry: Ship,
  stay: BedDouble,
  rental_car: CarFront,
  transfer: Bus,
  activity: Ticket,
  restaurant: UtensilsCrossed,
  event: Ticket,
  ticket: Ticket,
  custom: MapPinned,
};

function TypeIcon({ type }: { type: string }) {
  const Icon = typeIcons[type] || Route;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Data nog niet gekozen";
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  return format(startDate || endDate || "");
}

function timeAnchor(item: TripItemRow, timezone: string) {
  if (!item.start_at) return "–";
  return new Date(item.start_at).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: item.timezone || timezone,
  });
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
      <div className="px-5 py-6 sm:px-8 sm:py-9">
        <header className="flex items-start justify-between gap-4 border-b border-rule/10 pb-5">
          <div className="min-w-0">
            <h1 className="font-brand text-2xl font-semibold tracking-tight">Reis</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {activeTrip.destination_name || activeTrip.name} · {formatDateRange(activeTrip.start_date, activeTrip.end_date)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {items.length} onderdelen · {attentionCount} nog te regelen
            </p>
          </div>
          {!readOnly && (
            <Button variant="ghost" size="sm" onClick={() => openCreate()} className="shrink-0 text-primary">
              <Plus className="mr-1 h-4 w-4" />Toevoegen
            </Button>
          )}
        </header>

        {readOnly && (
          <p className="mt-4 border-l-2 border-rule/20 py-2 pl-3 text-sm text-muted-foreground">
            Deze reis staat in het archief en is alleen-lezen.
          </p>
        )}

        {!readOnly && (
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
            {quickAddTypes.map((value) => {
              const type = getTravelType(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => openCreate(value)}
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        )}

        {actionError && <p className="mt-4 text-sm font-medium text-destructive">{actionError}</p>}

        <section className="mt-7">
          <SectionLabel>Reisplan</SectionLabel>

          {itemsQuery.isLoading ? (
            <div className="mt-4 space-y-2">
              {[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-md bg-secondary/70" />)}
            </div>
          ) : itemsQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">Je reisgegevens konden niet worden geladen.</p>
          ) : groups.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Je reisplan is nog leeg. Begin met vervoer of verblijf; wat nog niet vaststaat mag op “Nog te regelen”.
            </p>
          ) : (
            <div className="mt-3 space-y-7">
              {groups.map(([day, dayItems]) => (
                <div key={day}>
                  <p className="border-b border-rule/10 pb-2 text-[13px] font-semibold text-foreground/70">
                    {day === "undated" ? "Nog niet ingepland" : formatTripDay(day, timezone)}
                  </p>
                  <div className="rule-divide">
                    {dayItems.map((item) => {
                      const type = getTravelType(item.type);
                      const canEdit = !readOnly && (isOrganizer || item.created_by === user?.id);
                      const displayTimezone = item.timezone || timezone;
                      const details = [item.location_name, item.provider, item.booking_reference]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <div key={item.id} className="flex items-start gap-3 py-3.5">
                          <span className="w-11 shrink-0 pt-0.5 text-xs font-medium tabular text-muted-foreground">
                            {timeAnchor(item, displayTimezone)}
                          </span>
                          <span className="shrink-0 pt-1">
                            <TypeIcon type={item.type} />
                          </span>
                          <button
                            type="button"
                            onClick={() => (canEdit ? openEdit(item) : undefined)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="block truncate text-[15px] font-medium leading-tight">{item.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {type.label}
                              {details ? ` · ${details}` : ""}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/70">{getTravelStatus(item.status)}</span>
                              {item.end_at && <span>tot {formatTripDateTime(item.end_at, displayTimezone)}</span>}
                              {item.price != null && (
                                <span className="tabular">
                                  {new Intl.NumberFormat("nl-NL", { style: "currency", currency: item.currency || currency }).format(item.price)}
                                </span>
                              )}
                            </span>
                          </button>
                          {item.booking_url && (
                            <a
                              href={item.booking_url}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 pt-1 text-muted-foreground hover:text-primary"
                              aria-label="Open boeking"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleDelete(item)}
                                className="shrink-0 pt-1 text-muted-foreground hover:text-destructive"
                                aria-label="Verwijderen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="shrink-0 pt-1 text-muted-foreground/60"
                                aria-label="Wijzigen"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
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