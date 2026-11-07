import { FormSheet } from "@/components/FormSheet";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, CheckSquare, ChevronRight, Plus, Receipt, Scale } from "lucide-react";
import { Trip, useTrip } from "@/contexts/TripContext";
import { tripTimingLabel } from "@/features/trips/presentation";
import { getTripReadiness } from "@/features/readiness/data";
import { getHomeFacts, emptyHomeFacts, personalFollowUps, type HomeFacts } from "@/features/trips/home-data";
import { tripPreparation } from "@/features/trips/preparation";
import { tripHasEnded } from "@/features/trips/overview";
import { listTripItems } from "@/features/travel/data";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { PageHeader, RowItem, RowList, SectionLabel } from "@/components/primitives";
import { TripThumb, TripVisual } from "@/components/TripVisual";
import { GettingStarted } from "@/features/onboarding/GettingStarted";
import heroHome from "@/assets/hero-home.jpg";
import { ProductButtons } from "@/components/ProductButtons";
import { BrandLogo } from "@/components/BrandLogo";
import { displayDecisionTitle } from "@/features/together/labels";

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "Data nog te kiezen";

  const format = (value: string, withYear: boolean) =>
    new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
    });

  if (startDate && endDate) {
    const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
    return `${format(startDate, !sameYear)} – ${format(endDate, true)}`;
  }
  return format(startDate || endDate || "", true);
}

function sortTrips(trips: Trip[]) {
  return [...trips].sort((a, b) => {
    if (!a.start_date && !b.start_date) return a.name.localeCompare(b.name);
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return a.start_date.localeCompare(b.start_date);
  });
}

/**
 * The next trip is the only place on this screen that earns extra surface: a wide
 * row with a small photo, the dates, the countdown and the preparation line.
 * Everything else stays a plain list row.
 */
function NextTrip({ trip, facts, userId }: { trip: Trip; facts: HomeFacts; userId?: string }) {
  const readinessQuery = useQuery({
    queryKey: ["trip-readiness", trip.id],
    queryFn: () => getTripReadiness(trip.id),
  });

  const itemsQuery = useQuery({ queryKey: ["trip-items", trip.id], queryFn: () => listTripItems(trip.id) });
  const ended = tripHasEnded(trip, trip.timezone || "Europe/Amsterdam");
  const preparation = tripPreparation({ activeTrip: trip, items: itemsQuery.data || [], tasks: facts.tasks.filter((task) => task.trip_id === trip.id), decisions: facts.decisions.filter((decision) => decision.trip_id === trip.id), readiness: readinessQuery.data, userId, ended });
  const first = preparation.things[0];

  return (
      <section className="tile-plain rounded-2xl p-3 sm:p-5">
      <p className="font-ui text-[12px] font-semibold text-muted-foreground">Eerstvolgende reis</p>
      <Link to={`/trip/${trip.id}`} className="flex items-center gap-3.5 py-1">
        <TripVisual
          name={trip.name}
          coverImageUrl={trip.cover_image_url}
          height="h-[72px]"
          rounded="rounded-lg"
          showBadge={false}
          className="w-[72px] shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-brand text-[22px] font-bold leading-tight">{trip.name}</span>
          <span className="num mt-1 block truncate text-[13px] text-muted-foreground">
            {formatDateRange(trip.start_date, trip.end_date)}
            {trip.destination_name ? ` · ${trip.destination_name}` : ""}
          </span>
          <span className="mt-0.5 block truncate font-ui text-[12px] font-semibold text-primary">
            {tripTimingLabel(trip.start_date, trip.end_date)}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </Link>

      {ended ? <p className="mt-3 text-xs text-muted-foreground">Deze reis is afgelopen.</p> : readinessQuery.data && itemsQuery.data ? (
        <div className="mt-1 space-y-1">
          {first && <Link to={first.href} className="block text-sm text-muted-foreground hover:text-foreground">{first.title}</Link>}
        </div>
      ) : <p className="mt-3 text-xs text-muted-foreground">Laden…</p>}
    </section>
  );
}

function TripRow({ trip }: { trip: Trip }) {
  return (
    <Link to={`/trip/${trip.id}`} className="row-tap flex items-center gap-3 py-3 transition-opacity hover:opacity-70">
      <TripThumb name={trip.name} coverImageUrl={trip.cover_image_url} className="opacity-60" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight">{trip.name}</span>
        <span className="num mt-0.5 block truncate text-xs text-muted-foreground">
          {formatDateRange(trip.start_date, trip.end_date)}
        </span>
      </span>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

export default function Trips() {
  const { userTrips, loading } = useTrip();
  const { user, profile } = useAuth();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [personalOpen, setPersonalOpen] = useState(false);

  const { activeTrips, archivedTrips } = useMemo(() => ({
    activeTrips: sortTrips(userTrips.filter((trip) => trip.status !== "archived")),
    archivedTrips: sortTrips(userTrips.filter((trip) => trip.status === "archived")),
  }), [userTrips]);

  const nextTrips = activeTrips.filter((trip) => !tripHasEnded(trip, trip.timezone || "Europe/Amsterdam"));
  const heroTrip = nextTrips[0];
  const otherTrips = activeTrips.filter((trip) => trip.id !== heroTrip?.id);
  const tripIds = activeTrips.map((trip) => trip.id);
  const factsQuery = useQuery({ queryKey: ["home-facts", user?.id, tripIds], queryFn: () => getHomeFacts(tripIds), enabled: Boolean(user && !loading), staleTime: 0 });
  const facts = factsQuery.data || emptyHomeFacts;
  const personal = user ? personalFollowUps(activeTrips, facts, user.id) : [];
  const firstName = profile?.display_name.trim().split(/\s+/)[0];

  return (
    <AppLayout>
      <section className="relative shrink-0">
        <div className="relative h-[calc(156px+env(safe-area-inset-top))] w-full overflow-hidden bg-secondary sm:h-[200px]">
          <img src={heroHome} alt="" aria-hidden width={1280} height={720} loading="eager" className="h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-foreground/40" />
          <div className="absolute inset-x-0 top-0 mx-auto max-w-3xl px-5 pt-[calc(env(safe-area-inset-top)+1rem)] sm:pt-6">
            <Link to="/trips" aria-label="Naar Home" className="mb-4 inline-flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden">
              <BrandLogo onImage className="h-10" />
            </Link>
            <PageHeader className="text-on-image" title={firstName ? `Hoi ${firstName}` : "Hoi"} action={userTrips.length > 0 &&
              <Button asChild variant="outline" size="sm" className="h-11 shrink-0 rounded-xl bg-card px-4 text-[15px] text-foreground hover:text-foreground">
                <Link to="/new-trip"><Plus className="mr-1.5 h-3.5 w-3.5" />Nieuwe reis</Link>
              </Button>
            } />
          </div>
        </div>
      </section>
      <div className="relative z-10 mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col gap-3 px-5 pb-3 sm:block sm:pb-16 max-sm:[&>section]:mt-0 max-sm:[&>section>div]:p-3 max-sm:[&>section_span.font-brand]:text-base">
        <div className="relative z-10 -mt-6 shrink-0 sm:-mt-14 sm:mb-8">
          <ProductButtons compact knaakieTo={heroTrip ? `/knaakie?tripId=${heroTrip.id}` : "/knaakie"} vakansieTo={heroTrip ? `/trip/${heroTrip.id}` : "/new-trip"} />
        </div>
        {loading ? (
          <div className="h-28 animate-pulse rounded-lg border border-border bg-card shadow-soft" />
        ) : heroTrip ? (
          <>
            <NextTrip trip={heroTrip} facts={facts} userId={user?.id} />
            <GettingStarted trip={heroTrip} hasAnyTrip={userTrips.length > 0} />
          </>
        ) : activeTrips.length ? <div className="pt-4"><GettingStarted trip={activeTrips[0]} hasAnyTrip={userTrips.length > 0} /></div> : (
          <div>
            <GettingStarted trip={null} hasAnyTrip={userTrips.length > 0} />
          </div>
        )}

        <div className="mt-auto grid shrink-0 grid-cols-2 gap-3 pt-1 sm:mt-6">
          {!loading && userTrips.length > 0 && <Button variant="secondary" onClick={() => setPersonalOpen(true)}><CheckSquare />Voor jou{personal.length > 0 ? ` · ${personal.length}` : ""}</Button>}
          {(otherTrips.length > 0 || archivedTrips.length > 0) && <Button variant="secondary" onClick={() => setArchiveOpen(true)}><Archive />Al je reizen</Button>}
        </div>
        <FormSheet open={personalOpen} onOpenChange={setPersonalOpen} title="Voor jou">
        {!loading && userTrips.length > 0 && <section>
          <SectionLabel>Voor jou</SectionLabel>
          {factsQuery.isPending ? <p className="py-3 text-sm text-muted-foreground">Laden…</p> : factsQuery.isError ? <p className="py-3 text-sm text-muted-foreground">Je overzicht is nu niet beschikbaar. <Button variant="link" onClick={() => void factsQuery.refetch()}>Opnieuw proberen</Button></p> : personal.length ? <RowList>
            {personal.map((item) => <RowItem key={item.key} icon={item.kind === "task" ? CheckSquare : item.kind === "decision" ? Scale : Receipt} title={item.kind === "decision" ? displayDecisionTitle(item.title) : item.title} meta={item.tripName} to={item.href} />)}
          </RowList> : <p className="py-3 text-sm text-muted-foreground">Niets dat op jou wacht.</p>}
        </section>}
        </FormSheet>
        <FormSheet open={archiveOpen} onOpenChange={setArchiveOpen} title="Al je reizen">
          {otherTrips.length > 0 && <RowList className="mt-2">{otherTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}</RowList>}
          {archivedTrips.length > 0 && <>
            <p className="mt-5 text-sm font-semibold text-muted-foreground">Afgelopen</p>
            <RowList>{archivedTrips.map((trip) => <TripRow key={trip.id} trip={trip} />)}</RowList>
          </>}
          <div className="h-6" />
        </FormSheet>
      </div>
    </AppLayout>
  );
}
