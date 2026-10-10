import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ChevronDown, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { deleteTripItem, listTripItems, TripItemRow } from "@/features/travel/data";
import { TripItemSheet } from "@/features/travel/TripItemSheet";
import { BookingPasteSheet } from "@/features/travel/BookingPasteSheet";
import { AccommodationSearchSheet } from "@/features/travel/AccommodationSearchSheet";
import { CalendarFeedSheet } from "@/features/travel/CalendarFeedSheet";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { ACCOMMODATION_DECISION_TITLE, chooseTripIdea, undoTripIdeaChoice } from "@/features/travel/accommodation";
import { providerLabel } from "@/features/travel/providers";
import { TripPageHeader } from "@/components/TripPageHeader";
import { toast } from "sonner";
import { DocumentsSection } from "@/features/documents/DocumentsSection";
import {
  DayHeader,
  EmptyLine,
  FilterChips,
  IconBubble,
  StatusWord,
  StickyBar,
  SwipeRow,
} from "@/components/primitives";
import { travelTypeIcon } from "@/features/travel/icons";
import {
  formatTripDay,
  getTravelStatus,
  getTravelType,
  timelineWarnings,
  travelStatuses,
  tripDayKey,
} from "@/features/travel/presentation";

const quickAddTypes = ["flight", "train", "stay", "activity", "custom"] as const;

const filters: ReadonlyArray<{ id: "all" | "transport" | "stay" | "doing"; label: string; types: readonly string[] }> = [
  { id: "all", label: "Alles", types: [] },
  { id: "transport", label: "Vervoer", types: ["flight", "train", "ferry", "rental_car", "transfer"] },
  { id: "stay", label: "Verblijf", types: ["stay"] },
  { id: "doing", label: "Doen", types: ["activity", "restaurant", "event", "ticket"] },
];

type FilterId = (typeof filters)[number]["id"];


function statusTone(status: string): "done" | "attention" | "muted" | "neutral" {
  if (status === "confirmed" || status === "paid") return "done";
  if (status === "planned") return "attention";
  if (status === "idea") return "neutral";
  if (status === "completed" || status === "cancelled") return "muted";
  return "neutral";
}

function timeAnchor(item: TripItemRow, timezone: string) {
  if (!item.start_at) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: item.timezone || timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(item.start_at));
}

export default function TripReis() {
  const { user } = useAuth();
  const { activeTrip, isOrganizer } = useTrip();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [staySearchOpen, setStaySearchOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItemRow | null>(null);
  const [createType, setCreateType] = useState<string>("custom");
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const tripId = activeTrip?.id || "";
  const timezone = activeTrip?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam";
  const currency = activeTrip?.currency || "EUR";
  const readOnly = activeTrip?.status === "archived";

  const itemsQuery = useQuery({
    queryKey: ["trip-items", tripId],
    queryFn: () => listTripItems(tripId),
    enabled: Boolean(tripId),
  });

  // Ideas are not on the timeline, so they never count towards the filters.
  const timelineItems = useMemo(() => (itemsQuery.data || []).filter((item) => item.status !== "idea"), [itemsQuery.data]);
  const counts = useMemo(() => {
    return filters
      .map((entry) => ({
        id: entry.id,
        label: entry.label,
        count: entry.types.length === 0 ? timelineItems.length : timelineItems.filter((item) => entry.types.includes(item.type)).length,
      }))
      .filter((entry) => entry.id === "all" || entry.count > 0);
  }, [timelineItems]);
  const showFilters = timelineItems.length >= 6;
  const usedStatuses = travelStatuses.filter((s) => s.value !== "idea" && timelineItems.some((item) => item.status === s.value));

  const groups = useMemo(() => {
    const allowed = filters.find((entry) => entry.id === filter)?.types || [];
    const visible = (itemsQuery.data || []).filter(
      (item) => item.status !== "idea" && (allowed.length === 0 || allowed.includes(item.type)) && (statusFilter === "all" || item.status === statusFilter),
    );
    const grouped = new Map<string, TripItemRow[]>();
    for (const item of visible) {
      const key = tripDayKey(item.start_at, item.timezone || timezone);
      grouped.set(key, [...(grouped.get(key) || []), item]);
    }

    return [...grouped.entries()].sort(([a], [b]) => {
      if (a === "undated") return 1;
      if (b === "undated") return -1;
      return a.localeCompare(b);
    });
  }, [itemsQuery.data, timezone, filter, statusFilter]);

  const ideas = useMemo(() => (itemsQuery.data || []).filter((item) => item.status === "idea"), [itemsQuery.data]);

  const warnings = useMemo(
    () => timelineWarnings(itemsQuery.data || [], activeTrip?.start_date ?? null, activeTrip?.end_date ?? null),
    [itemsQuery.data, activeTrip?.start_date, activeTrip?.end_date],
  );

  if (!activeTrip) return null;

  const items = itemsQuery.data || [];

  const refreshItems = async () => {
    await queryClient.invalidateQueries({ queryKey: ["trip-items", activeTrip.id] });
  };

  /** Quick add only preselects a type in the existing form. It never creates anything by itself. */
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

  const chooseIdea = async (item: TripItemRow) => {
    setActionError("");
    try {
      const undo = await chooseTripIdea(item.id);
      await refreshItems();
      if (undo.closed_decision_id) await queryClient.invalidateQueries();
      if (item.type === "stay") {
        const n = undo.removed.length;
        toast(
          n > 0
            ? `${item.title} is je verblijf. De andere ${n} ${n === 1 ? "idee is" : "ideeën zijn"} weggehaald.`
            : `${item.title} is je verblijf.`,
          {
            action: {
              label: "Ongedaan maken",
              onClick: () => {
                void undoTripIdeaChoice(activeTrip.id, undo)
                  .then(async () => {
                    await refreshItems();
                    await queryClient.invalidateQueries();
                  })
                  .catch((error) => {
                    console.error("undo choice failed", error);
                    toast.error("Ongedaan maken lukte niet.");
                  });
              },
            },
          },
        );
      }
    } catch (error) {
      console.error("choose idea failed", error);
      setActionError("Dit onderdeel kiezen lukte niet.");
    }
  };

  const handleDelete = async (item: TripItemRow) => {
    setActionError("");
    await deleteTripItem(activeTrip.id, item.id);
    await refreshItems();
  };

  return (
    <AppLayout>
      <div className="px-5 pb-12 pt-4 sm:px-8">
        <TripPageHeader
          startDate={activeTrip.start_date}
          endDate={activeTrip.end_date}
          destination={activeTrip.destination_name}
          addMenu={readOnly ? undefined : (
            <>
              <DropdownMenuItem onClick={() => setBookingSheetOpen(true)}>
                <Mail className="mr-2 h-4 w-4" strokeWidth={1.75} />Boeking plakken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStaySearchOpen(true)}>
                <Search className="mr-2 h-4 w-4" strokeWidth={1.75} />Verblijf zoeken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCalendarOpen(true)}>
                <CalendarPlus className="mr-2 h-4 w-4" strokeWidth={1.75} />Zet in je agenda
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">Zelf invullen</DropdownMenuLabel>
              {quickAddTypes.map((value) => {
                const type = getTravelType(value);
                const TypeIcon = travelTypeIcon(value);
                return (
                  <DropdownMenuItem key={value} onClick={() => openCreate(value)}>
                    <TypeIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />{type.label}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
        />

        {readOnly && (
          <div className="mt-4 flex items-center gap-2 border-t border-rule/10 pt-3 text-sm text-muted-foreground">
            <Archive className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            Deze reis staat in het archief en is alleen-lezen.
          </div>
        )}


        {actionError && <p className="mt-4 text-sm font-medium text-destructive">{actionError}</p>}

        {showFilters && (
          <StickyBar className="mt-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <FilterChips<FilterId> value={filter} onChange={setFilter} options={counts} />
              {usedStatuses.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-md text-[13px]" aria-label="Filter op status">
                      {statusFilter === "all" ? "Status" : getTravelStatus(statusFilter)}
                      <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>Alle statussen</DropdownMenuItem>
                    {usedStatuses.map((s) => (
                      <DropdownMenuItem key={s.value} onClick={() => setStatusFilter(s.value)}>{s.label}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </StickyBar>
        )}

        {!readOnly && warnings.length > 0 && (
          <details className="group mt-4 border-y border-rule">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} />
              {warnings.length === 1 ? warnings[0].message : `${warnings.length} punten om na te kijken`}
              {(warnings.length > 1 || warnings[0]?.kind === "outside_trip") && <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />}
            </summary>
            {(warnings.length > 1 || warnings[0]?.kind === "outside_trip") && (
              <div className="divide-y divide-rule border-t border-rule">
                {warnings.map((w) => (
                  <div key={w.kind + w.message} className="py-2 pl-6 text-sm text-muted-foreground">
                    <p>{w.message}</p>
                    {w.kind === "outside_trip" && (
                      <ul className="mt-1 list-disc pl-4">
                        {items.filter((i) => w.itemIds.includes(i.id)).map((i) => <li key={i.id}>{i.title}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </details>
        )}

        <section className="mt-3">
          {itemsQuery.isLoading ? (
            <div className="mt-2 space-y-2">
              {[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-sm bg-secondary" />)}
            </div>
          ) : itemsQuery.isError ? (
            <p className="mt-3 text-sm text-destructive">Je reisgegevens konden niet worden geladen.</p>
          ) : groups.length === 0 ? (
            <EmptyLine
              text={
                items.length === 0
                  ? "Nog niets ingepland. Begin met vervoer of verblijf; wat nog niet vaststaat mag op Nog regelen."
                  : items.length === ideas.length
                    ? "Nog niets vastgelegd. Kies hieronder een idee of voeg zelf iets toe."
                    : "Niets in deze filter."
              }
              actionLabel={readOnly || items.length > 0 ? undefined : "Eerste onderdeel toevoegen"}
              onClick={readOnly || items.length > 0 ? undefined : () => openCreate()}
            />
          ) : (
            <div>
              {groups.map(([day, dayItems]) => (
                <div key={day} className="mb-2">
                  <DayHeader
                    label={day === "undated" ? "Nog niet ingepland" : formatTripDay(day, timezone)}
                    meta={`${dayItems.length}`}
                  />
                  <div className="border-t border-rule">
                    {dayItems.map((item) => {
                      const type = getTravelType(item.type);
                      const canEdit = !readOnly && (isOrganizer || item.created_by === user?.id);
                      const displayTimezone = item.timezone || timezone;
                      const TypeIcon = travelTypeIcon(item.type);
                      const row = (
                        <div className="flex min-h-[56px] items-center gap-3 border-b border-rule py-2.5">
                          {/* Time gutter keeps every row aligned on one vertical rhythm. */}
                          <span className="relative flex w-11 shrink-0 flex-col items-start self-stretch">
                            <span className="num font-ui text-[12px] font-semibold leading-5 text-foreground">
                              {timeAnchor(item, displayTimezone)}
                            </span>
                            {dayItems.length > 1 && <span aria-hidden className="mt-1 w-px flex-1 bg-rail" />}
                          </span>
                          <IconBubble icon={TypeIcon} tone="muted" />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 break-words text-[15px] font-medium leading-tight">{item.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {[type.label, providerLabel(item.provider)].filter(Boolean).join(" · ")} ·{" "}
                              <StatusWord tone={statusTone(item.status)}>{getTravelStatus(item.status)}</StatusWord>
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={1.75} aria-hidden />
                        </div>
                      );

                      if (!canEdit) return <div key={item.id}>{row}</div>;

                      return (
                        <SwipeRow
                          key={item.id}
                          actions={[
                            { label: "Bewerken", icon: Pencil, onClick: () => openEdit(item) },
                            { label: "Wissen", icon: Trash2, tone: "danger", onClick: () => void handleDelete(item) },
                          ]}
                        >
                          <div className="flex items-center border-b border-rule">
                            <button type="button" onClick={() => openEdit(item)} className="min-w-0 flex-1 text-left [&>div]:border-b-0">
                              {row}
                            </button>
                          </div>
                        </SwipeRow>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {ideas.length > 0 && (
          <details className="group mt-4 border-y border-rule">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium">
              Ideeën ({ideas.length})
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="divide-y divide-rule border-t border-rule">
              {ideas.map((idea) => (
                <div key={idea.id} className="flex items-center gap-3 py-2.5">
                  <button type="button" onClick={() => openEdit(idea)} className="min-w-0 flex-1 text-left">
                    <span className="line-clamp-2 break-words text-[15px] font-medium leading-tight">{idea.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {[getTravelType(idea.type).label, providerLabel(idea.provider) || (idea.booking_url ? new URL(idea.booking_url).hostname.replace(/^www\./, "") : null)].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                  {!readOnly && (
                    <Button size="sm" variant="outline" className="shrink-0 rounded-md" onClick={() => void chooseIdea(idea)}>
                      Dit wordt het
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

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
        onDelete={readOnly ? undefined : handleDelete}
        destination={activeTrip.destination_name}
      />
      <AccommodationSearchSheet
        open={staySearchOpen}
        onOpenChange={setStaySearchOpen}
        tripId={activeTrip.id}
        destination={activeTrip.destination_name || ""}
        startDate={activeTrip.start_date}
        endDate={activeTrip.end_date}
        groupSize={activeTrip.group_size ?? null}
        onSaved={refreshItems}
      />
      {!readOnly && <CalendarFeedSheet open={calendarOpen} onOpenChange={setCalendarOpen} tripId={activeTrip.id} />}
      <BookingPasteSheet
        open={bookingSheetOpen}
        onOpenChange={setBookingSheetOpen}
        tripId={activeTrip.id}
        onSaved={refreshItems}
      />
    </AppLayout>
  );
}
