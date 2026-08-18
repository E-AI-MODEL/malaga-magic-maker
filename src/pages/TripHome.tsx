import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, CheckSquare, FileText, MapPin, Route, Scale, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import { activeReadinessChecks, getTripReadiness, readinessAction } from "@/features/readiness/data";
import { tripTimingLabel } from "@/features/trips/presentation";
import { listTripItems } from "@/features/travel/data";
import { listDecisions, listTasks } from "@/features/together/data";
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
  const { user } = useAuth();
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

  const tasksQuery = useQuery({
    queryKey: ["trip-tasks", tripId],
    queryFn: () => listTasks(tripId),
    enabled: Boolean(tripId),
  });

  const decisionsQuery = useQuery({
    queryKey: ["trip-decisions", tripId],
    queryFn: () => listDecisions(tripId),
    enabled: Boolean(tripId),
  });

  if (!activeTrip) return null;

  const readiness = readinessQuery.data;
  const attention = readiness ? activeReadinessChecks(readiness) : [];
  const timing = tripTimingLabel(activeTrip.start_date, activeTrip.end_date);
  const now = Date.now();
  const upcomingItems = (itemsQuery.data || [])
    .filter((item) => item.start_at && new Date(item.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())
    .slice(0, 3);

  const openTasks = (tasksQuery.data || []).filter((task) => task.status !== "done");
  const myTasks = user ? openTasks.filter((task) => task.assigned_user_id === user.id) : [];
  const openDecisions = (decisionsQuery.data || []).filter((decision) => decision.status === "open");
  const myOpenDecisions = user
    ? openDecisions.filter(
        (decision) => !decision.options.some((option) => option.votes.some((vote) => vote.user_id === user.id)),
      )
    : [];

  const personalItems = [
    ...myTasks.map((task) => ({
      key: `task-${task.id}`,
      icon: CheckSquare,
      title: task.title,
      meta: "Jouw taak",
    })),
    ...myOpenDecisions.map((decision) => ({
      key: `decision-${decision.id}`,
      icon: Scale,
      title: decision.title,
      meta: "Jij hebt nog niet gestemd",
    })),
  ].slice(0, 3);

  const attentionTotal = attention.reduce((total, check) => total + check.attention_count, 0);
  const trackedTotal = (readiness?.checks.length || 0) + attentionTotal;
  const readinessSentence = readinessQuery.isLoading
    ? "Voorbereiding wordt opgehaald…"
    : !readiness
      ? "Status van de voorbereiding is nu niet beschikbaar."
      : readiness.status === "ready"
        ? "Alles wat in Vakansie staat, is geregeld."
        : `${Math.max(0, trackedTotal - attentionTotal)} van ${trackedTotal} geregeld · ${attentionTotal} ${attentionTotal === 1 ? "punt vraagt" : "punten vragen"} aandacht`;

  return (
    <AppLayout>
      <div className="px-5 pb-12 pt-5 sm:px-8">
        {activeTrip.cover_image_url ? (
          <img
            src={activeTrip.cover_image_url}
            alt={`Omslagfoto van ${activeTrip.name}`}
            loading="lazy"
            className="mb-5 h-32 w-full rounded-xl object-cover sm:h-40"
          />
        ) : (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-secondary px-4 py-3 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm">{activeTrip.destination_name || "Bestemming nog niet gekozen"}</span>
          </div>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{timing}</p>
        <h1 className="mt-1.5 font-brand text-[28px] font-semibold leading-tight sm:text-3xl">{activeTrip.name}</h1>
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

        {personalItems.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Voor jou</SectionLabel>
            <RowList className="mt-1">
              {personalItems.map((item) => (
                <RowItem
                  key={item.key}
                  icon={item.icon}
                  title={item.title}
                  meta={item.meta}
                  to={`/trip/${activeTrip.id}/samen`}
                />
              ))}
            </RowList>
          </section>
        )}

        {attention.length > 0 && (
          <section className="mt-8">
            <SectionLabel>Dit vraagt aandacht</SectionLabel>
            <RowList className="mt-1">
              {attention.slice(0, 4).map((check) => {
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
          <SectionLabel>Daarna komt dit</SectionLabel>
          <RowList className="mt-1">
            {itemsQuery.isLoading ? (
              <RowItem icon={CalendarClock} title="Eerstvolgende wordt geladen…" />
            ) : upcomingItems.length === 0 ? (
              <RowItem
                icon={CalendarClock}
                title="Nog niets op je tijdlijn"
                meta="Voeg vluchten, verblijf en activiteiten toe"
                to={`/trip/${activeTrip.id}/reis`}
              />
            ) : (
              upcomingItems.map((item) => (
                <RowItem
                  key={item.id}
                  icon={CalendarClock}
                  title={item.title}
                  meta={formatTripDateTime(item.start_at, item.timezone || timezone)}
                  to={`/trip/${activeTrip.id}/reis`}
                />
              ))
            )}
          </RowList>
        </section>

        <section className="mt-8">
          <SectionLabel>Verder in deze reis</SectionLabel>
          <RowList className="mt-1">
            <RowItem
              icon={Route}
              title="Reisplan"
              meta={`${readiness?.facts.trip_item_count ?? 0} onderdelen`}
              to={`/trip/${activeTrip.id}/reis`}
            />
            <RowItem
              icon={Users}
              title="Samen"
              meta={`${readiness?.facts.member_count ?? 0} ${readiness?.facts.member_count === 1 ? "persoon" : "personen"} · ${openTasks.length} open taken`}
              to={`/trip/${activeTrip.id}/samen`}
            />
            <RowItem
              icon={FileText}
              title="Documenten"
              meta={`${readiness?.facts.document_count ?? 0} bewaard`}
              to={`/trip/${activeTrip.id}/reis`}
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
