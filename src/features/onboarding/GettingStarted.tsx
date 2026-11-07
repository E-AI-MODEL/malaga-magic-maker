import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Circle, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
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
  const hide = () => {
    if (storageKey) {
      localStorage.setItem(storageKey, "1");
      setHidden(true);
    }
  };

  const next = steps.find((step) => !step.done);
  if (!next) return null;

  return (
    <section className="mt-7" aria-label={isCompanion ? "Help je groep" : "Aan de slag"}>
      <div className="tile-plain flex items-center gap-3 rounded-2xl p-4">
        <Link to={next.href} className="flex min-w-0 flex-1 items-center gap-3">
          <Circle className="h-6 w-6 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          <span className="min-w-0 flex-1 font-brand text-lg font-semibold leading-tight">{next.title}</span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
        <button type="button" onClick={hide} aria-label="Verbergen" className="shrink-0 rounded-full p-2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
