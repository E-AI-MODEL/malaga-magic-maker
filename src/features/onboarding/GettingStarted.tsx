import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, Circle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { SectionLabel } from "@/components/primitives";
import {
  buildGettingStartedSteps,
  gettingStartedDone,
  getGettingStartedFacts,
} from "./data";

const HIDE_KEY = "vakansie_start_hidden";

/**
 * The "Aan de slag" checklist on Mijn reizen. Everything ticks off from data
 * that already exists; there is no new table and no state of its own beyond
 * the per-user hide switch in localStorage. The block disappears once every
 * step is done.
 */
export function GettingStarted({ trip, hasAnyTrip }: { trip: { id: string } | null; hasAnyTrip: boolean }) {
  const { user } = useAuth();
  const storageKey = user ? `${HIDE_KEY}:${user.id}` : null;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(storageKey ? localStorage.getItem(storageKey) === "1" : false);
  }, [storageKey]);

  const factsQuery = useQuery({
    queryKey: ["getting-started", user?.id ?? null, trip?.id ?? null],
    queryFn: () => getGettingStartedFacts({ tripId: trip?.id ?? null, userId: user!.id }),
    enabled: Boolean(user),
  });

  if (!user || hidden) return null;
  const facts = factsQuery.data;
  if (!facts) return null;

  const steps = buildGettingStartedSteps({
    hasTrip: hasAnyTrip || Boolean(trip),
    tripId: trip?.id ?? null,
    ...facts,
  });
  if (gettingStartedDone(steps)) return null;

  const isCompanion = Boolean(trip && !facts.isOrganizer);
  const doneCount = steps.filter((step) => step.done).length;
  const hide = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "1");
      setHidden(true);
    }
  };

  return (
    <section className="mt-7">
      <SectionLabel
        action={
          <button
            type="button"
            onClick={hide}
            className="shrink-0 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Verbergen
          </button>
        }
      >
        {isCompanion ? "Help je groep" : "Aan de slag"}
      </SectionLabel>
      <p className="num mt-1 text-[12px] text-muted-foreground">
        {doneCount} van {steps.length} afgevinkt
      </p>
      <ul className="rule-divide mt-1">
        {steps.map((step) => (
          <li key={step.key}>
            {step.done ? (
              <div className="flex min-h-[48px] items-center gap-3 py-3 text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3 w-3 text-primary" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="text-[14px]">{step.title}</span>
              </div>
            ) : (
              <Link
                to={step.href}
                className="row-tap flex min-h-[48px] items-start gap-3 py-3 transition-opacity hover:opacity-70"
              >
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" strokeWidth={1.5} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[15px] font-medium leading-tight">
                    {step.title}
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                  </span>
                  {step.tip && <span className="mt-0.5 block text-[13px] text-muted-foreground">{step.tip}</span>}
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
