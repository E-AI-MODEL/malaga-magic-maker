import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, Route, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { activeReadinessChecks, getTripReadiness, readinessAction } from "@/features/readiness/data";
import { tripTimingLabel } from "@/features/trips/presentation";
import { listTripItems } from "@/features/travel/data";
import { formatTripDateTime } from "@/features/travel/presentation";
import { RecentActivity } from "@/features/notifications/RecentActivity";
import { EmptyLine, ReadinessBar, RowItem, RowList, SectionLabel } from "@/components/primitives";

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

export default function TripHome() {
  const { activeTrip } = useTrip();
  const tripId = activeTrip?.id || "";
  const timezone = activeTrip?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam";

  const readinessQuery = useQuery({
    queryKey: ["trip-readiness", tripId],
    queryFn: () => getTripReadiness(tripId),
    enabled: Boolean(tripId),
  });

  const itemsQuery = useQuery({
    queryKey: ["trip-items", tripId],
    queryFn: () => listTripItems(tripId),
    enabled: Boolean(tripId),
  });

  if (!activeTrip) return null;

  const readiness = readinessQuery.data;
  const attention = readiness ? activeReadinessChecks(readiness) : [];
  const timing = tripTimingLabel(activeTrip.start_date, activeTrip.end_date);
  const now = Date.now();
  const nextItem = (itemsQuery.data || [])
    .filter((item) => item.start_at && new Date(item.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())[0];

  const attentionTotal = attention.reduce((total, check) => total + check.attention_count, 0);
  const trackedTotal = (readiness?.checks.length || 0) + attentionTotal;
  const readinessSentence = readinessQuery.isLoading
    ? "Voorbereiding wordt opgehaald…"
    : !readiness
      ? "Status van de voorbereiding is nu niet beschikbaar."
      : readiness.status === "ready"
        ? "Alles wat in Vakansie staat, is geregeld."
        : `${attentionTotal} ${attentionTotal === 1 ? "ding vraagt" : "dingen vragen"} nog aandacht.`;

  return (
    <AppLayout>
      <div className="px-5 pb-12 pt-5 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{timing}</p>
        <h1 className="mt-1.5 font-display text-[28px] font-extrabold leading-tight tracking-tight sm:text-3xl">{activeTrip.name}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {formatDateRange(activeTrip.start_date, activeTrip.end_date)}
          {activeTrip.destination_name ? ` · ${activeTrip.destination_name}` : ""}
        </p>

        <div className="mt-5">
          <ReadinessBar
            done={Math.max(0, trackedTotal - attentionTotal)}
            total={Math.max(1, trackedTotal)}
            sentence={readinessSentence}
          />
        </div>

        {attention.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Nu belangrijk</SectionLabel>
            <RowList className="mt-1">
              {attention.slice(0, 3).map((check) => {
                const action = readinessAction(check, activeTrip.id);
                return (
                  <RowItem
                    key={check.key}
                    icon={AlertCircle}
                    tone="attention"
                    title={check.label}
                    meta={action?.label}
                    trailing={check.attention_count > 1 ? String(check.attention_count) : undefined}
                    to={action?.href}
                  />
                );
              })}
            </RowList>
          </section>
        )}

        <section className="mt-8">
          <SectionLabel>Je reis</SectionLabel>
          <RowList className="mt-1">
            <RowItem
              icon={CalendarClock}
              title={itemsQuery.isLoading ? "Eerstvolgende wordt geladen…" : nextItem ? nextItem.title : "Nog niets op je tijdlijn"}
              meta={nextItem ? formatTripDateTime(nextItem.start_at, nextItem.timezone || timezone) : "Voeg vluchten, verblijf en activiteiten toe"}
              to={`/trip/${activeTrip.id}/reis`}
            />
            <RowItem
              icon={Route}
              title="Reisplan"
              meta={`${readiness?.facts.trip_item_count ?? 0} onderdelen · ${readiness?.facts.document_count ?? 0} documenten`}
              to={`/trip/${activeTrip.id}/reis`}
            />
            <RowItem
              icon={Users}
              title="Samen"
              meta={`${readiness?.facts.member_count ?? 0} ${readiness?.facts.member_count === 1 ? "persoon" : "personen"} · taken, keuzes en kosten`}
              to={`/trip/${activeTrip.id}/samen`}
            />
          </RowList>
          {!readinessQuery.isLoading && !readiness && (
            <EmptyLine text="De voorbereidingsstatus kon niet worden opgehaald." />
          )}
        </section>

        <RecentActivity tripId={activeTrip.id} />
      </div>
    </AppLayout>
  );
}
