import type { Trip } from "@/contexts/TripContext";
import type { TaskRow, TripItemRow } from "@/integrations/supabase/database";
import type { DecisionBundle } from "@/features/together/data";
import { activeReadinessChecks, readinessAction, type TripReadiness } from "@/features/readiness/data";
import { computeReminders } from "@/features/reminders/data";
import { firstThings, type FirstThing } from "./overview";

/** Shared first action for Home and the trip overview. */
export function tripPreparation({ activeTrip, items, tasks, decisions, readiness, userId, ended }: {
  activeTrip: Trip;
  items: TripItemRow[];
  tasks: TaskRow[];
  decisions: DecisionBundle[];
  readiness?: TripReadiness;
  userId?: string;
  ended: boolean;
}) {
    const now = Date.now();
    const hasMyVote = (decision: (typeof decisions)[number]) =>
      Boolean(userId && decision.options.some((option) => option.votes.some((vote) => vote.user_id === userId)));

    const myTasks = userId ? tasks.filter((task) => task.status !== "done" && task.assigned_user_id === userId) : [];
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

    // Only gentle, data-driven suggestions: solo trips, own transport and trips
    // without bookings are complete trips, not missing pieces.
    const suggestions: FirstThing[] = [];
    if (readiness && !ended) {
      if (readiness.facts.trip_item_count === 0)
        suggestions.push({ key: "s-items", title: "Zet je eerste onderdeel in je planning", actionLabel: "Naar Reis", href: `/trip/${activeTrip.id}/reis` });
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

    return { things };
}
