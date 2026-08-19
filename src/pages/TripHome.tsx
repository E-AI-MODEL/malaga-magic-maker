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
import { EmptyLine, ReadinessBar, RowItem, RowList, SectionLabel, StatusChip, Surface } from "@/components/primitives";
import { TripVisual } from "@/components/TripVisual";

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
      <div className="pb-12">
        <TripVisual
          name={activeTrip.name}
          coverImageUrl={activeTrip.cover_image_url}
          height="h-[176px] sm:h-[220px]"
          rounded="rounded-none"
        />

        <div className="px-5 sm:px-8">
          <Surface className="relative z-10 -mt-8 px-4 pb-4 pt-4 sm:mx-2 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <StatusChip tone={attentionTotal > 0 ? "attention" : "done"}>{timing}</StatusChip>
              <span className="truncate font-ui text-[11px] font-semibold text-muted-foreground">
                {formatDateRange(activeTrip.start_date, activeTrip.end_date)}
              </span>
            </div>
            <h1 className="mt-3 font-brand text-[28px] font-semibold leading-tight sm:text-3xl">{activeTrip.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
              <span className="truncate">{activeTrip.destination_name || "Bestemming nog niet gekozen"}</span>
            </p>
            <div className="mt-4 border-t border-rule/10 pt-4">
              <ReadinessBar
                done={Math.max(0, trackedTotal - attentionTotal)}
                total={Math.max(1, trackedTotal)}
                sentence={readinessSentence}
              />
            </div>
          </Surface>

          {personalItems.length > 0 && (
            <section className="mt-8">
              <SectionLabel>Voor jou</SectionLabel>
              <Surface className="mt-2 px-4 shadow-none">
                <RowList>
                  {personalItems.map((item) => (
                    <RowItem
                      key={item.key}
                      icon={item.icon}
                      emphasis
                      title={item.title}
                      meta={item.meta}
                      to={`/trip/${activeTrip.id}/samen`}
                    />
                  ))}
                </RowList>
              </Surface>
            </section>
          )}

          <section className="mt-8">
            <SectionLabel>Dit vraagt aandacht</SectionLabel>
            {attention.length > 0 ? (
              <Surface className="mt-2 px-4 shadow-none">
                <RowList>
                  {attention.slice(0, 5).map((check) => {
                    const action = readinessAction(check, activeTrip.id);
                    return (
                      <RowItem
                        key={check.key}
                        icon={AlertCircle}
                        emphasis
                        tone="attention"
                        title={check.label}
                        meta={action?.label}
                        trailing={check.attention_count > 1 ? String(check.attention_count) : undefined}
                        to={action?.href}
                      />
                    );
                  })}
                </RowList>
              </Surface>
            ) : readinessQuery.isLoading ? (
              <RowList className="mt-1">
                <RowItem icon={CalendarClock} title="Voorbereiding wordt opgehaald…" />
              </RowList>
            ) : (
              <EmptyLine text="Alles wat in Vakansie staat, is geregeld. Nieuwe aandachtspunten verschijnen hier vanzelf." />
            )}
          </section>

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
      </div>
    </AppLayout>
  );
}
