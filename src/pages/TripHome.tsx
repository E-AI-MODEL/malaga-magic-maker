import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, ChevronDown, Scale } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import { getTripReadiness } from "@/features/readiness/data";
import { listTripItems } from "@/features/travel/data";
import { listDecisions, listExpenses, listTasks } from "@/features/together/data";
import { settlementByCurrency } from "@/features/together/settlement";
import { travelTypeIcon } from "@/features/travel/icons";
import { countdownLabel, excludeFirstThings, tripHasEnded, upcomingTripItems } from "@/features/trips/overview";
import { tripPreparation } from "@/features/trips/preparation";
import { Button } from "@/components/ui/button";
import { EmptyLine, RowItem, RowList, SectionLabel, TimelineRow } from "@/components/primitives";
import { TripVisual } from "@/components/TripVisual";
import { WeatherStrip } from "@/features/trips/WeatherStrip";
import { showWeatherStrip } from "@/features/trips/weather";

function shortDate(value: string, timeZone: string) {
  return new Date(value)
    .toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone })
    .replace(".", "");
}

export default function TripHome() {
  const { activeTrip } = useTrip();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const tripId = activeTrip?.id || "";
  const timezone = activeTrip?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam";
  const ended = activeTrip ? tripHasEnded(activeTrip, timezone) : false;

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
  const expensesQuery = useQuery({
    queryKey: ["together-expenses", tripId],
    queryFn: () => listExpenses(tripId),
    enabled: Boolean(tripId && ended),
  });
  const hasOpenAmounts = settlementByCurrency(expensesQuery.data || []).some((group) => group.transfers.length > 0);

  const view = useMemo(() => {
    if (!activeTrip) return null;
    const now = Date.now();
    const items = itemsQuery.data || [];
    const tasks = tasksQuery.data || [];
    const decisions = decisionsQuery.data || [];
    const { things } = tripPreparation({ activeTrip, items, tasks, decisions, readiness, userId: user?.id, ended });
    const myTasks = user ? tasks.filter((task) => task.status !== "done" && task.assigned_user_id === user.id) : [];
    const myVotes = decisions.filter((decision) => decision.status === "open" && !decision.options.some((option) => option.votes.some((vote) => vote.user_id === user?.id)));

    const upcoming = upcomingTripItems(items, now, activeTrip);

    const personal = excludeFirstThings([
      ...myTasks.map((task) => ({ key: `task-${task.id}`, icon: CheckSquare, title: task.title, meta: "Jouw taak" })),
      ...myVotes.map((decision) => ({ key: `decision-${decision.id}`, icon: Scale, title: decision.title, meta: "Nog niet gestemd" })),
    ], things).slice(0, 3);

    return { things, upcoming, personal };
  }, [activeTrip, ended, itemsQuery.data, tasksQuery.data, decisionsQuery.data, readiness, user]);

  if (!activeTrip || !view) return null;

  const [first, ...rest] = view.things;

  return (
    <AppLayout>
      <div className="pb-8">
        <TripVisual
          name={activeTrip.name}
          coverImageUrl={activeTrip.cover_image_url}
          height="h-[180px]"
          rounded="rounded-none"
          overlay
          showBadge={false}
        >
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words font-brand text-[24px] font-bold leading-tight text-on-image">{activeTrip.name}</h1>
              {activeTrip.destination_name && (
                <p className="truncate text-[12px] font-semibold text-on-image/85">{activeTrip.destination_name}</p>
              )}
              <p className="num mt-1 font-display uppercase text-[30px] font-bold leading-none text-on-image">
                {countdownLabel(activeTrip.start_date, activeTrip.end_date)}
              </p>
            </div>
          </div>
        </TripVisual>

        {!ended && showWeatherStrip(activeTrip, timezone) && <WeatherStrip tripId={activeTrip.id} timeZone={timezone} />}


        <div className="space-y-6 px-5 pt-4 sm:px-8">
          {ended ? (
            <section className="border-b border-border py-4">
              <p className="text-[15px] font-medium">Deze reis is afgelopen.</p>
              {hasOpenAmounts && <Button variant="outline" className="mt-3" onClick={() => navigate(`/trip/${activeTrip.id}/samen?section=expenses`)}>Naar Knaakie</Button>}
            </section>
          ) : <>
          <section className="py-2">
            <SectionLabel>Eerst dit</SectionLabel>
            {readinessQuery.isLoading ? (
              <p className="mt-2 text-[15px] text-muted-foreground">Laden…</p>
            ) : first ? (
              <>
                <p className="mt-1.5 text-[19px] font-semibold leading-snug">{first.title}</p>
                {first.meta && <p className="mt-0.5 text-[13px] text-muted-foreground">{first.meta}</p>}
                <Button className="mt-3 h-11 w-full" onClick={() => navigate(first.href)}>
                  {first.actionLabel}
                </Button>
                {rest.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpanded((value) => !value)}
                      className="mt-2.5 flex items-center gap-1 font-ui text-[12px] font-semibold text-muted-foreground hover:text-foreground"
                      aria-expanded={expanded}
                    >
                      +{rest.length} {rest.length === 1 ? "ander punt" : "andere punten"}
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                    {expanded && (
                      <RowList className="mt-1">
                        {rest.map((thing) => (
                          <RowItem key={thing.key} title={thing.title} meta={thing.meta || thing.actionLabel} to={thing.href} />
                        ))}
                      </RowList>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="mt-1.5 text-[15px] text-muted-foreground">Niets dat nu op je wacht.</p>
            )}
          </section>

          <section>
            <SectionLabel>Eerstvolgend</SectionLabel>
            {itemsQuery.isLoading ? (
              <p className="py-3 text-[14px] text-muted-foreground">Laden…</p>
            ) : view.upcoming.length === 0 ? (
              <EmptyLine text="Nog niets ingepland." actionLabel="Naar Reis" to={`/trip/${activeTrip.id}/reis`} />
            ) : (
              <ol className="relative mt-1">
                {view.upcoming.map((item, index) => {
                  const Icon = travelTypeIcon(item.type);
                  return (
                    <li key={item.id}>
                      <TimelineRow time={shortDate(item.start_at as string, item.timezone || timezone)} icon={Icon} title={item.title}
                        category={["own_vehicle", "flight", "train", "ferry", "transfer", "rental_car"].includes(item.type) ? "transport" : item.type === "stay" ? "stay" : item.type === "restaurant" ? "food" : ["activity", "event", "ticket"].includes(item.type) ? "activity" : "other"}
                        connected={index < view.upcoming.length - 1} to={`/trip/${activeTrip.id}/reis`} />
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {view.personal.length > 0 && (
            <section>
              <SectionLabel>Voor jou</SectionLabel>
              <RowList className="mt-0.5">
                {view.personal.map((item) => (
                  <RowItem key={item.key} icon={item.icon} title={item.title} meta={item.meta} to={`/trip/${activeTrip.id}/samen`} />
                ))}
              </RowList>
            </section>
          )}
          </>}
        </div>
      </div>
    </AppLayout>
  );
}
