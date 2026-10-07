import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ChevronDown, FileText, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
  formatTripDateTime,
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

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Data nog niet gekozen";
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  return format(startDate || endDate || "");
}

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

  const counts = useMemo(() => {
    const all = itemsQuery.data || [];
    return filters.map((entry) => ({
      id: entry.id,
      label: entry.label,
      count: entry.types.length === 0 ? all.length : all.filter((item) => entry.types.includes(item.type)).length,
    }));
  }, [itemsQuery.data]);

  const groups = useMemo(() => {
    const allowed = filters.find((entry) => entry.id === filter)?.types || [];
    const visible = (itemsQuery.data || []).filter(
      (item) => (allowed.length === 0 || allowed.includes(item.type)) && (statusFilter === "all" || item.status === statusFilter),
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

  const handleDelete = async (item: TripItemRow) => {
    setActionError("");
    await deleteTripItem(activeTrip.id, item.id);
    await refreshItems();
  };

  return (
    <AppLayout>
      <div className="px-5 pb-12 pt-5 sm:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-[30px] font-bold uppercase leading-tight">Reis</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateRange(activeTrip.start_date, activeTrip.end_date)}
              {activeTrip.destination_name ? ` · ${activeTrip.destination_name}` : ""}
            </p>
          </div>
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="mt-0.5 shrink-0 rounded-md">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Toevoegen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onClick={() => setBookingSheetOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" strokeWidth={1.75} />Boeking plakken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStaySearchOpen(true)}>
                  <Search className="mr-2 h-4 w-4" strokeWidth={1.75} />Verblijf zoeken
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase text-muted-foreground">Zelf invullen</DropdownMenuLabel>
                {quickAddTypes.map((value) => {
                  const type = getTravelType(value);
                  const TypeIcon = travelTypeIcon(value);
                  return (
                    <DropdownMenuItem key={value} onClick={() => openCreate(value)}>
                      <TypeIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />{type.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {readOnly && (
          <div className="mt-4 flex items-center gap-2 border-t border-rule/10 pt-3 text-sm text-muted-foreground">
            <Archive className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            Deze reis staat in het archief en is alleen-lezen.
          </div>
        )}


        {actionError && <p className="mt-4 text-sm font-medium text-destructive">{actionError}</p>}

        {items.length > 0 && (
          <StickyBar className="mt-4">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 overflow-x-auto">
                <FilterChips<FilterId> value={filter} onChange={setFilter} options={counts} />
              </div>
              <select
                aria-label="Filter op status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 w-28 shrink-0 rounded-md border border-border bg-background px-2 font-ui text-base text-muted-foreground"
              >
                <option value="all">Status</option>
                {travelStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </StickyBar>
        )}

        {!readOnly && warnings.length > 0 && (
          <details className="group mt-4 border-y border-rule">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} />
              {warnings.length === 1 ? warnings[0].message : `${warnings.length} punten om na te kijken`}
              {warnings.length > 1 && <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />}
            </summary>
            {warnings.length > 1 && (
              <div className="divide-y divide-rule border-t border-rule">
                {warnings.map((w) => (
                  <p key={w.kind + w.message} className="py-2 pl-6 text-sm text-muted-foreground">{w.message}</p>
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
                      const facts = [item.location_name, item.provider, item.booking_reference]
                        .filter(Boolean)
                        .join(" · ");
                      const TypeIcon = travelTypeIcon(item.type);

                      const row = (
                        <div className="flex min-h-[56px] items-center gap-3 border-b border-rule py-2.5">
                          {/* Time gutter keeps every row aligned on one vertical rhythm. */}
                          <span className="relative flex w-11 shrink-0 flex-col items-start self-stretch">
                            <span className="num font-ui text-[12px] font-semibold leading-5 text-foreground">
                              {timeAnchor(item, displayTimezone)}
                            </span>
                            <span aria-hidden className="mt-1 w-px flex-1 bg-rail" />
                          </span>
                          <IconBubble icon={TypeIcon} tone="muted" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium leading-tight">{item.title}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {type.label}
                              {facts ? ` · ${facts}` : ""}
                              {item.end_at ? ` · tot ${formatTripDateTime(item.end_at, displayTimezone)}` : ""}
                            </span>
                          </span>
                          {item.booking_url && <FileText className="h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={1.75} />}
                          <StatusWord tone={statusTone(item.status)}>{getTravelStatus(item.status)}</StatusWord>
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
                          <button type="button" onClick={() => openEdit(item)} className="w-full text-left">
                            {row}
                          </button>
                        </SwipeRow>
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
        onDelete={readOnly ? undefined : handleDelete}
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
      <BookingPasteSheet
        open={bookingSheetOpen}
        onOpenChange={setBookingSheetOpen}
        tripId={activeTrip.id}
        onSaved={refreshItems}
      />
    </AppLayout>
  );
}
