import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ChevronDown, Mail, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { deleteTripItem, listTripItems, TripItemRow } from "@/features/travel/data";
import { TripItemSheet } from "@/features/travel/TripItemSheet";
import { BookingPasteSheet } from "@/features/travel/BookingPasteSheet";
import { AccommodationSearchSheet } from "@/features/travel/AccommodationSearchSheet";
import { CalendarFeedSheet } from "@/features/travel/CalendarFeedSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ACCOMMODATION_DECISION_TITLE, chooseTripIdea, ideaActionMessage, undoTripIdeaChoice } from "@/features/travel/accommodation";
import { providerLabel } from "@/features/travel/providers";
import { TripPageHeader } from "@/components/TripPageHeader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocumentsSection } from "@/features/documents/DocumentsSection";
import {
  DayHeader,
  SwipeRow,
  TimelineRow,
} from "@/components/primitives";
import { travelTypeIcon } from "@/features/travel/icons";
import {
  formatTripDay,
  getTravelType,
  timelineWarnings,
  tripDayKey,
} from "@/features/travel/presentation";

const addTiles = [
  { type: "flight", label: "Vervoer" },
  { type: "stay", label: "Verblijf" },
  { type: "activity", label: "Activiteit" },
] as const;

const filters: ReadonlyArray<{ id: "all" | "transport" | "stay" | "doing"; label: string; types: readonly string[] }> = [
  { id: "all", label: "Alles", types: [] },
  { id: "transport", label: "Vervoer", types: ["own_vehicle", "flight", "train", "ferry", "rental_car", "transfer"] },
  { id: "stay", label: "Verblijf", types: ["stay"] },
  { id: "doing", label: "Doen", types: ["activity", "restaurant", "event", "ticket"] },
];




function timeAnchor(item: TripItemRow, timezone: string) {
  if (!item.start_at) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: item.timezone || timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(item.start_at));
}

export default function TripReis() {
  const { user, isAdmin } = useAuth();
  const { activeTrip, isOrganizer } = useTrip();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bookingSheetOpen, setBookingSheetOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [staySearchOpen, setStaySearchOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItemRow | null>(null);
  const [createType, setCreateType] = useState<string>("custom");
  const [actionError, setActionError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);

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
  const groups = useMemo(() => {
    const visible = (itemsQuery.data || []).filter((item) => item.status !== "idea");
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
  }, [itemsQuery.data, timezone]);

  const canChoose = isOrganizer || isAdmin;
  const openStayDecision = useQuery({
    queryKey: ["open-stay-decision", tripId],
    queryFn: async () => {
      const { data } = await supabase.from("decisions").select("id").eq("trip_id", tripId).eq("status", "open").eq("title", ACCOMMODATION_DECISION_TITLE).limit(1);
      return Boolean(data && data.length > 0);
    },
    enabled: Boolean(tripId) && !canChoose,
  });

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
            duration: 10000,
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
                    toast.error(ideaActionMessage(error, "Ongedaan maken lukte niet."));
                  });
              },
            },
          },
        );
      }
    } catch (error) {
      console.error("choose idea failed", error);
      setActionError(ideaActionMessage(error, "Dit onderdeel kiezen lukte niet."));
    }
  };

  const handleDelete = async (item: TripItemRow) => {
    setActionError("");
    await deleteTripItem(activeTrip.id, item.id);
    await refreshItems();
  };

  // Keep the page short: the first three rows here, the full list in a panel.
  const shownGroups: typeof groups = [];
  // Short phones get two rows so Documenten still fits on the screen.
  let budget = typeof window !== "undefined" && window.innerHeight < 760 ? 2 : 3;
  for (const [day, dayItems] of groups) {
    if (budget <= 0) break;
    shownGroups.push([day, dayItems.slice(0, budget)]);
    budget -= Math.min(budget, dayItems.length);
  }
  const hiddenCount = timelineItems.length - shownGroups.reduce((n, [, d]) => n + d.length, 0);

  const renderGroups = (list: typeof groups, sticky = true) => (
    <>
              {list.map(([day, dayItems]) => (
                <div key={day} className="mb-2">
                  <DayHeader
                    sticky={sticky}
                    label={day === "undated" ? "Nog niet ingepland" : formatTripDay(day, timezone)}
                  />
                  <div className="border-t border-rule">
                    {dayItems.map((item, index) => {
                      const type = getTravelType(item.type);
                      const canEdit = !readOnly && (isOrganizer || item.created_by === user?.id);
                      const displayTimezone = item.timezone || timezone;
                      const TypeIcon = travelTypeIcon(item.type);
                      const row = <TimelineRow
                        time={timeAnchor(item, displayTimezone)}
                        icon={TypeIcon}
                        title={item.title}
                        category={filters[1].types.includes(item.type) ? "transport" : item.type === "stay" ? "stay" : item.type === "restaurant" ? "food" : filters[3].types.includes(item.type) ? "activity" : "other"}
                        connected={index < dayItems.length - 1}
                        onClick={canEdit ? () => openEdit(item) : undefined}
                        meta={providerLabel(item.provider) || type.label}
                      />;

                      if (!canEdit) return <div key={item.id}>{row}</div>;

                      return (
                        <SwipeRow
                          key={item.id}
                          actions={[
                            { label: "Bewerken", icon: Pencil, onClick: () => openEdit(item) },
                            { label: "Wissen", icon: Trash2, tone: "danger", onClick: () => void handleDelete(item) },
                          ]}
                        >
                          {row}
                        </SwipeRow>
                      );
                    })}
                  </div>
                </div>
              ))}
    </>
  );

  return (
    <AppLayout>
      <div className="px-5 pb-12 pt-4 sm:px-8">
        <TripPageHeader
          title="Reis"
          startDate={activeTrip.start_date}
          endDate={activeTrip.end_date}
          destination={activeTrip.destination_name}
          onAdd={readOnly ? undefined : () => setAddOpen(true)}
        />

        {readOnly && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Archive className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            Alleen-lezen: deze reis is gearchiveerd.
          </div>
        )}

        {actionError && <p className="mt-4 text-sm font-medium text-destructive">{actionError}</p>}

        {!readOnly && warnings.length > 0 && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} />
            {warnings[0].message}
          </p>
        )}

        <section className="mt-3">
          {itemsQuery.isLoading ? (
            <div className="mt-2 space-y-2">
              {[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-sm bg-secondary" />)}
            </div>
          ) : itemsQuery.isError ? (
            <p className="mt-3 text-sm text-destructive">Je reisgegevens konden niet worden geladen.</p>
          ) : groups.length === 0 ? (
            <div className="mt-6">
              <p className="text-[17px] font-semibold">Zet je vlucht of verblijf erin.</p>
              {!readOnly && <Button className="mt-4 h-14 w-full text-[16px]" onClick={() => setBookingSheetOpen(true)}><Mail className="mr-2 h-5 w-5" />Boeking scannen</Button>}
              {!readOnly && <Button variant="outline" className="mt-2 h-12 w-full" onClick={() => setAddOpen(true)}>Zelf invullen</Button>}
            </div>
          ) : (
            <div>
              {renderGroups(shownGroups)}
              {hiddenCount > 0 && (
                <Button variant="outline" className="mt-2 h-12 w-full" onClick={() => setAllOpen(true)}>
                  Alle onderdelen ({timelineItems.length})
                </Button>
              )}
            </div>
          )}
        </section>

        {ideas.length > 0 && (
          <details className="group mt-4 border-y border-rule">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium">
              {ideas.length === 1 ? "1 idee" : `${ideas.length} ideeën`}
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            {!readOnly && !canChoose && openStayDecision.data && (
              <p className="border-t border-rule py-2.5 text-sm text-muted-foreground">De organisator kiest; stem mee via Samen.</p>
            )}
            <div className="divide-y divide-rule border-t border-rule">
              {ideas.map((idea) => (
                <div key={idea.id} className="flex items-center gap-3 py-2.5">
                  <button type="button" onClick={() => openEdit(idea)} className="min-w-0 flex-1 text-left">
                    <span className="line-clamp-2 break-words text-[15px] font-medium leading-tight">{idea.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {[getTravelType(idea.type).label, providerLabel(idea.provider) || (idea.booking_url ? new URL(idea.booking_url).hostname.replace(/^www\./, "") : null)].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                  {!readOnly && canChoose && (
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

      <Sheet open={allOpen} onOpenChange={setAllOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle className="text-left">Alle onderdelen</SheetTitle></SheetHeader>
          <div className="mt-3">{renderGroups(groups, false)}</div>
        </SheetContent>
      </Sheet>
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader><SheetTitle className="text-left">Toevoegen</SheetTitle></SheetHeader>
          <Button className="mt-4 h-14 w-full justify-start text-[16px]" onClick={() => { setAddOpen(false); setBookingSheetOpen(true); }}>
            <Mail className="mr-3 h-5 w-5" />Boeking scannen
          </Button>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {addTiles.map(({ type: value, label }) => {
              const TypeIcon = travelTypeIcon(value);
              return (
                <button key={value} type="button" onClick={() => { setAddOpen(false); openCreate(value); }}
                  className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border text-[14px] font-semibold hover:bg-accent">
                  <TypeIcon className="h-6 w-6" strokeWidth={1.75} />{label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-medium text-muted-foreground">
            <button type="button" className="py-2 hover:text-foreground" onClick={() => { setAddOpen(false); openCreate("custom"); }}>Iets anders</button>
            <button type="button" className="py-2 hover:text-foreground" onClick={() => { setAddOpen(false); setStaySearchOpen(true); }}>Verblijf zoeken</button>
            <button type="button" className="py-2 hover:text-foreground" onClick={() => { setAddOpen(false); setCalendarOpen(true); }}>Zet in je agenda</button>
          </div>
        </SheetContent>
      </Sheet>
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
