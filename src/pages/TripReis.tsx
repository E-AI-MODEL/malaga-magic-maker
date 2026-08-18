import { CalendarDays, MapPin, Route } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";

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

export default function TripReis() {
  const { activeTrip } = useTrip();
  if (!activeTrip) return null;

  return (
    <AppLayout>
      <div className="px-5 py-7 sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Reis</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Van vertrek tot aankomst</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Hier komt je reis chronologisch bij elkaar: vervoer, verblijf, activiteiten, reserveringen en andere momenten die vaststaan.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />Periode
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{formatDateRange(activeTrip.start_date, activeTrip.end_date)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />Bestemming
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{activeTrip.destination_name || "Nog niet ingevuld"}</p>
          </div>
        </div>

        <div className="mt-8 flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-6 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Route className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-display text-xl font-extrabold">Je reisoverzicht is nog leeg</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Reisonderdelen worden hier straks in tijdsvolgorde getoond, zodat je niet meer hoeft te zoeken tussen losse boekingen en notities.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
