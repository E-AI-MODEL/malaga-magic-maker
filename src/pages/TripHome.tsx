import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, ChevronDown, Scale } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import { activeReadinessChecks, getTripReadiness, readinessAction } from "@/features/readiness/data";
import { listTripItems } from "@/features/travel/data";
import { listDecisions, listExpenses, listTasks } from "@/features/together/data";
import { computeBalances, settleBalances } from "@/features/together/settle";
import { computeReminders } from "@/features/reminders/data";
import { travelTypeIcon } from "@/features/travel/icons";
import { countdownLabel, excludeFirstThings, firstThings, preparationScore, tripHasEnded, upcomingTripItems, type FirstThing } from "@/features/trips/overview";
import { timelineWarnings } from "@/features/travel/presentation";
import { Button } from "@/components/ui/button";
import { ReadinessBar, RowItem, RowList, SectionLabel } from "@/components/primitives";
import { TripVisual } from "@/components/TripVisual";

const TYPE_TINT: Record<string, string> = {
  flight: "bg-tint-transport/10 text-tint-transport",
  train: "bg-tint-transport/10 text-tint-transport",
  ferry: "bg-tint-transport/10 text-tint-transport",
  transfer: "bg-tint-transport/10 text-tint-transport",
  rental_car: "bg-tint-transport/10 text-tint-transport",
  stay: "bg-tint-stay/10 text-tint-stay",
  activity: "bg-tint-activity/10 text-tint-activity",
  event: "bg-tint-activity/10 text-tint-activity",
  ticket: "bg-tint-activity/10 text-tint-activity",
  restaurant: "bg-tint-food/10 text-tint-food",
};

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
  const hasOpenAmounts = settleBalances(computeBalances((expensesQuery.data || []).map((expense) => ({
    paidByUserId: expense.paid_by_user_id,
    amount: Number(expense.amount) || 0,
    splits: expense.splits.map((split) => ({ user_id: split.user_id, amount: Number(split.amount) || 0 })),
  })))).length > 0;

  const view = useMemo(() => {
    if (!activeTrip) return null;
    const now = Date.now();
    const items = itemsQuery.data || [];
    const tasks = tasksQuery.data || [];
    const decisions = decisionsQuery.data || [];
    const hasMyVote = (decision: (typeof decisions)[number]) =>
      Boolean(user && decision.options.some((option) => option.votes.some((vote) => vote.user_id === user.id)));

    const myTasks = user ? tasks.filter((task) => task.status !== "done" && task.assigned_user_id === user.id) : [];
    const myVotes = decisions.filter((decision) => decision.status === "open" && !hasMyVote(decision));
    const samen = `/trip/${activeTrip.id}/samen`;

    const reminders = ended
      ? []
      : computeReminders({
          now,
          tripStart: activeTrip.start_date,
          items,
          tasks,
          decisions: decisions.map((decision) => ({
            id: decision.id,
            title: decision.title,
            status: decision.status,
            closes_at: decision.closes_at,
            hasMyVote: hasMyVote(decision),
          })),
        });

    const checks = readiness ? activeReadinessChecks(readiness) : [];
    const checkThing = (key: "dates" | "destination" | "bookings"): FirstThing[] =>
      checks
        .filter((check) => check.key === key)
        .map((check) => {
          const action = readinessAction(check, activeTrip.id);
          return { key: `check-${key}`, title: check.label, actionLabel: action.label, href: action.href };
        });

    const suggestions: FirstThing[] = [];
    if (readiness && !ended) {
      if (readiness.facts.trip_item_count === 0)
        suggestions.push({ key: "s-items", title: "Zet je heenreis en verblijf erin", actionLabel: "Naar Reis", href: `/trip/${activeTrip.id}/reis` });
      if (readiness.facts.member_count <= 1)
        suggestions.push({ key: "s-members", title: "Nodig je reisgenoten uit", actionLabel: "Uitnodigen", href: `/trip/${activeTrip.id}/settings` });
      if (readiness.facts.document_count === 0 && readiness.facts.trip_item_count > 0)
        suggestions.push({ key: "s-docs", title: "Bewaar je tickets en bevestigingen", actionLabel: "Naar Reis", href: `/trip/${activeTrip.id}/reis` });
    }

    const things = firstThings({
      urgent: reminders
        .filter((reminder) => reminder.tone === "urgent")
        .map((reminder) => ({
          key: reminder.key,
          title: reminder.title,
          meta: reminder.meta,
          actionLabel: "Bekijken",
          href: `/trip/${activeTrip.id}/${reminder.target}`,
        })),
      mine: [
        ...myTasks.map((task) => ({ key: `task-${task.id}`, title: task.title, meta: "Jouw taak", actionLabel: "Taak openen", href: samen })),
        ...myVotes.map((decision) => ({ key: `decision-${decision.id}`, title: decision.title, meta: "Wacht op jouw stem", actionLabel: "Stemmen", href: samen })),
      ],
      basics: [...checkThing("dates"), ...checkThing("destination")],
      bookings: checkThing("bookings"),
      suggestions,
    });

    const upcoming = upcomingTripItems(items, now);

    const personal = excludeFirstThings([
      ...myTasks.map((task) => ({ key: `task-${task.id}`, icon: CheckSquare, title: task.title, meta: "Jouw taak" })),
      ...myVotes.map((decision) => ({ key: `decision-${decision.id}`, icon: Scale, title: decision.title, meta: "Nog niet gestemd" })),
    ], things).slice(0, 3);

    const score = preparationScore({
      checks: readiness?.checks || [],
      itemCount: items.length,
      missingStay: timelineWarnings(items, activeTrip.start_date ?? null, activeTrip.end_date ?? null).some((w) => w.kind === "missing_stay"),
    });

    return { things, upcoming, personal, done: score.done, total: score.total };
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

        {!ended && !readinessQuery.isLoading && !itemsQuery.isLoading && (
          <div className="px-5 pt-3 sm:px-8">
            <ReadinessBar done={view.done} total={view.total} sentence={`${view.done} van ${view.total} geregeld`} />
          </div>
        )}

        <div className="space-y-6 px-5 pt-4 sm:px-8">
          {ended ? (
            <section className="border-b border-border py-4">
              <p className="text-[15px] font-medium">Deze reis is afgelopen.</p>
              {hasOpenAmounts && <Button variant="outline" className="mt-3" onClick={() => navigate(`/trip/${activeTrip.id}/samen`)}>Naar Knaakie</Button>}
            </section>
          ) : <>
          <section className="border-l-4 border-primary bg-band p-4">
            <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Eerst dit</p>
            {readinessQuery.isLoading ? (
              <p className="mt-2 text-[15px] text-muted-foreground">Laden…</p>
            ) : first ? (
              <>
                <p className="mt-1.5 font-display uppercase tracking-tight text-[19px] font-extrabold leading-snug">{first.title}</p>
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
              <p className="mt-1.5 font-display uppercase tracking-tight text-[19px] font-extrabold">Alles geregeld. Goede reis.</p>
            )}
          </section>

          <section>
            <SectionLabel>Eerstvolgend</SectionLabel>
            {itemsQuery.isLoading ? (
              <p className="py-3 text-[14px] text-muted-foreground">Laden…</p>
            ) : view.upcoming.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate(`/trip/${activeTrip.id}/reis`)}
                className="py-3 text-left text-[14px] text-muted-foreground hover:text-foreground"
              >
                Nog niets ingepland. Voeg vervoer, verblijf of een activiteit toe via Reis.
              </button>
            ) : (
              <ol className="relative mt-1">
                <span aria-hidden className="absolute bottom-5 left-[82px] top-5 w-px bg-border" />
                {view.upcoming.map((item) => {
                  const Icon = travelTypeIcon(item.type);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/trip/${activeTrip.id}/reis`)}
                        className="grid w-full grid-cols-[64px_36px_minmax(0,1fr)] items-center gap-2 py-2.5 text-left"
                      >
                        <span className="num whitespace-nowrap font-ui text-[13px] font-semibold leading-tight">
                          {shortDate(item.start_at as string, item.timezone || timezone)}
                        </span>
                        <span
                          aria-hidden
                          className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full ${TYPE_TINT[item.type] || "bg-tint-other/10 text-tint-other"}`}
                        >
                          <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
                        </span>
                        <span className="truncate text-[15px] font-medium">{item.title}</span>
                      </button>
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
