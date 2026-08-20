import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarClock, CheckSquare, Scale } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import { activeReadinessChecks, getTripReadiness, readinessAction } from "@/features/readiness/data";
import { tripTimingLabel } from "@/features/trips/presentation";
import { listTripItems } from "@/features/travel/data";
import { listDecisions, listTasks } from "@/features/together/data";
import { formatTripDateTime } from "@/features/travel/presentation";
import { RecentActivity } from "@/features/notifications/RecentActivity";
import { CountBar, EmptyLine, ReadinessBar, RowItem, RowList, SectionLabel, SuggestionRow } from "@/components/primitives";
import { TripVisual } from "@/components/TripVisual";

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Data nog te kiezen";
  const format = (value: string) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  return format(startDate || endDate || "");
}

export default function TripHome() {
  const { activeTrip } = useTrip();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);
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

  const readiness = readinessQuery.data;

  /**
   * Hansie works inside the screen: the same authorized readiness facts become
   * short proposals you can act on or dismiss, instead of a chat you have to read.
   */
  const suggestions = useMemo(() => {
    if (!readiness || !tripId || activeTrip?.status === "archived") return [];
    const list: Array<{ key: string; title: string; meta: string; action: string; href: string }> = [];
    if (readiness.facts.trip_item_count === 0) {
      list.push({ key: "items", title: "Zet je heenreis en verblijf erin", meta: "Nog niets op de tijdlijn", action: "Openen", href: `/trip/${tripId}/reis` });
    }
    if (readiness.facts.member_count <= 1) {
      list.push({ key: "members", title: "Nodig je reisgenoten uit", meta: "Je bent nu de enige", action: "Openen", href: `/trip/${tripId}/settings` });
    }
    if (readiness.facts.document_count === 0 && readiness.facts.trip_item_count > 0) {
      list.push({ key: "docs", title: "Bewaar je tickets en bevestigingen", meta: "Nog geen documenten", action: "Openen", href: `/trip/${tripId}/reis` });
    }
    return list.filter((item) => !dismissed.includes(item.key)).slice(0, 2);
  }, [readiness, tripId, dismissed, activeTrip?.status]);

  if (!activeTrip) return null;

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
    ...myTasks.map((task) => ({ key: `task-${task.id}`, icon: CheckSquare, title: task.title, meta: "Jouw taak" })),
    ...myOpenDecisions.map((decision) => ({ key: `decision-${decision.id}`, icon: Scale, title: decision.title, meta: "Nog niet gestemd" })),
  ].slice(0, 3);

  const attentionTotal = attention.reduce((total, check) => total + check.attention_count, 0);
  const trackedTotal = (readiness?.checks.length || 0) + attentionTotal;
  const readinessSentence = readinessQuery.isLoading
    ? "Voorbereiding laden…"
    : !readiness
      ? "Voorbereiding niet beschikbaar"
      : readiness.status === "ready"
        ? "Alles geregeld"
        : `${Math.max(0, trackedTotal - attentionTotal)} van ${trackedTotal} geregeld`;

  return (
    <AppLayout>
      <div className="pb-10">
        <TripVisual
          name={activeTrip.name}
          coverImageUrl={activeTrip.cover_image_url}
          height="h-[140px]"
          rounded="rounded-none"
          overlay
          showBadge={false}
        >
          <div>
            <p className="num font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              {formatDateRange(activeTrip.start_date, activeTrip.end_date)}
            </p>
            <h1 className="mt-0.5 truncate font-brand text-[26px] font-semibold leading-tight text-white">{activeTrip.name}</h1>
            <p className="num mt-0.5 truncate text-[12px] font-semibold text-white/85">
              {timing}
              {activeTrip.destination_name ? ` · ${activeTrip.destination_name}` : ""}
            </p>
          </div>
        </TripVisual>

        <div className="px-5 sm:px-8">
          <div className="border-b border-rule py-3.5">
            <CountBar
              items={[
                { label: "Onderdelen", value: readiness?.facts.trip_item_count ?? 0, to: `/trip/${activeTrip.id}/reis` },
                { label: "Open taken", value: openTasks.length, to: `/trip/${activeTrip.id}/samen` },
                { label: "Keuzes", value: openDecisions.length, to: `/trip/${activeTrip.id}/samen` },
                { label: "Documenten", value: readiness?.facts.document_count ?? 0, to: `/trip/${activeTrip.id}/reis` },
              ]}
            />
          </div>

          <div className="py-4">
            <ReadinessBar
              done={Math.max(0, trackedTotal - attentionTotal)}
              total={Math.max(1, trackedTotal)}
              sentence={readinessSentence}
            />
          </div>

          {personalItems.length > 0 && (
            <section className="border-t border-rule pt-1">
              <SectionLabel>Voor jou</SectionLabel>
              <RowList className="mt-0.5">
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

          <section className="mt-6 border-t border-rule pt-1">
            <SectionLabel>Vraagt aandacht</SectionLabel>
            {attention.length > 0 ? (
              <RowList className="mt-0.5">
                {attention.slice(0, 5).map((check) => {
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
            ) : readinessQuery.isLoading ? (
              <RowList className="mt-0.5">
                <RowItem icon={CalendarClock} title="Laden…" />
              </RowList>
            ) : (
              <EmptyLine text="Niets open." />
            )}

            {suggestions.length > 0 && (
              <div className="mt-1 border-t border-rule">
                {suggestions.map((suggestion) => (
                  <SuggestionRow
                    key={suggestion.key}
                    title={suggestion.title}
                    meta={suggestion.meta}
                    actionLabel={suggestion.action}
                    onAccept={() => navigate(suggestion.href)}
                    onDismiss={() => setDismissed((current) => [...current, suggestion.key])}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mt-6 border-t border-rule pt-1">
            <SectionLabel>Eerstvolgend</SectionLabel>
            <RowList className="mt-0.5">
              {itemsQuery.isLoading ? (
                <RowItem icon={CalendarClock} title="Laden…" />
              ) : upcomingItems.length === 0 ? (
                <RowItem
                  icon={CalendarClock}
                  title="Nog niets ingepland"
                  meta="Vervoer, verblijf of activiteit toevoegen"
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

          <RecentActivity tripId={activeTrip.id} />
        </div>
      </div>
    </AppLayout>
  );
}
