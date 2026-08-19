import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CalendarClock, ChevronRight, FileText, Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { deleteTripItem, listTripItems, TripItemRow } from "@/features/travel/data";
import { TripItemSheet } from "@/features/travel/TripItemSheet";
import { DocumentsSection } from "@/features/documents/DocumentsSection";
import { EmptyLine, IconBubble, RowList, SectionLabel, StatusWord } from "@/components/primitives";
import { travelTypeIcon } from "@/features/travel/icons";
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
      month: "short",
      year: "numeric",
    });
  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  return format(startDate || endDate || "");
}

function statusTone(status: string): "done" | "attention" | "muted" | "neutral" {
  if (status === "confirmed") return "done";
  if (status === "planned") return "attention";
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
            <h1 className="font-ui text-[22px] font-semibold leading-tight">Reis</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDateRange(activeTrip.start_date, activeTrip.end_date)}
              {activeTrip.destination_name ? ` · ${activeTrip.destination_name}` : ""}
            </p>
          </div>
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={() => openCreate()} className="mt-0.5 shrink-0 rounded-full">
              <Plus className="mr-1.5 h-3.5 w-3.5" />Toevoegen
            </Button>
          )}
        </div>

        {readOnly && (
          <div className="mt-4 flex items-center gap-2 border-t border-rule/10 pt-3 text-sm text-muted-foreground">
            <Archive className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            Deze reis staat in het archief en is alleen-lezen.
          </div>
        )}

        {!readOnly && (
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
            {quickAddTypes.map((value) => {
              const type = getTravelType(value);
              const TypeIcon = travelTypeIcon(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => openCreate(value)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 font-ui text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <TypeIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {type.label}
                </button>
              );
            })}
          </div>
        )}

        {actionError && <p className="mt-4 text-sm font-medium text-destructive">{actionError}</p>}

        <section className="mt-7">
          <SectionLabel>Tijdlijn</SectionLabel>

          {itemsQuery.isLoading ? (
            <div className="mt-2 space-y-2">
              {[0, 1, 2].map((row) => <div key={row} className="h-12 animate-pulse rounded-sm bg-secondary" />)}
            </div>
          ) : itemsQuery.isError ? (
            <p className="mt-3 text-sm text-destructive">Je reisgegevens konden niet worden geladen.</p>
          ) : groups.length === 0 ? (
            <EmptyLine
              text="Nog niets ingepland. Begin met vervoer of verblijf; wat nog niet vaststaat mag op Nog regelen."
              actionLabel={readOnly ? undefined : "Eerste onderdeel toevoegen"}
              onClick={readOnly ? undefined : () => openCreate()}
            />
          ) : (
            <div className="mt-2 space-y-6">
              {groups.map(([day, dayItems]) => (
                <div key={day}>
                  <h3 className="font-ui text-[13px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {day === "undated" ? "Nog niet ingepland" : formatTripDay(day, timezone)}
                  </h3>
                  <RowList className="mt-1">
                    {dayItems.map((item) => {
                      const type = getTravelType(item.type);
                      const canEdit = !readOnly && (isOrganizer || item.created_by === user?.id);
                      const displayTimezone = item.timezone || timezone;
                      const facts = [item.location_name, item.provider, item.booking_reference]
                        .filter(Boolean)
                        .join(" · ");
                      const TypeIcon = travelTypeIcon(item.type);
                      const body = (
                        <>
                          <span className="w-11 shrink-0 font-ui text-[12px] font-semibold tabular text-muted-foreground">
                            {timeAnchor(item, displayTimezone)}
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
                          {canEdit && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
                        </>
                      );

                      const rowClass =
                        "flex min-h-[52px] w-full items-center gap-3 py-3 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

                      return canEdit ? (
                        <button key={item.id} type="button" onClick={() => openEdit(item)} className={`${rowClass} transition-opacity hover:opacity-70`}>
                          {body}
                        </button>
                      ) : (
                        <div key={item.id} className={rowClass}>{body}</div>
                      );
                    })}
                  </RowList>
                </div>
              ))}
            </div>
          )}
        </section>

        {items.length > 0 && !itemsQuery.isLoading && (
          <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
            {items.length} {items.length === 1 ? "onderdeel" : "onderdelen"} in je reis
          </p>
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
      />
    </AppLayout>
  );
}
