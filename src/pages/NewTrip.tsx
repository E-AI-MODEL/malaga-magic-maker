import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Loader2, MapPin, Users } from "lucide-react";
import { useTrip } from "@/contexts/TripContext";
import { describePlanLimit } from "@/features/pro/limits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const currencies = ["EUR", "USD", "GBP", "CHF"];

export default function NewTrip() {
  const { createTrip } = useTrip();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupSize, setGroupSize] = useState("1");
  const [currency, setCurrency] = useState("EUR");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Amsterdam");

  const goToDetails = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Geef je reis een naam.");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setStep(1);
      setError("Geef je reis een naam.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setError("De einddatum kan niet vóór de startdatum liggen.");
      return;
    }

    setSubmitting(true);
    try {
      const trip = await createTrip({
        name: name.trim(),
        description: description.trim() || undefined,
        destination_name: destination.trim() || undefined,
        destination_country: country.trim() || undefined,
        start_date: startDate || null,
        end_date: endDate || null,
        group_size: Math.max(1, Number.parseInt(groupSize, 10) || 1),
        timezone,
        currency,
      });

      if (!trip) {
        setError("De reis kon niet worden aangemaakt. Probeer het opnieuw.");
        return;
      }

      navigate(`/trip/${trip.id}`, { replace: true });
    } catch (caught) {
      setError(describePlanLimit(caught) ?? "De reis kon niet worden aangemaakt. Probeer het opnieuw.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 py-7 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" className="-ml-3">
            <Link to="/trips">
              <ArrowLeft className="mr-2 h-4 w-4" />Mijn reizen
            </Link>
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">Stap {step} van 2</span>
        </div>

        <div className="mt-6 flex gap-2" aria-hidden="true">
          <span className="h-1.5 flex-1 rounded-full bg-primary" />
          <span className={`h-1.5 flex-1 rounded-full ${step === 2 ? "bg-primary" : "bg-secondary"}`} />
        </div>

        {step === 1 ? (
          <>
            <div className="mt-9">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nieuwe reis</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Geef je reis een plek.</h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Begin klein. Een naam is genoeg om te starten; bestemming en de rest kun je altijd later aanvullen.
              </p>
            </div>

            <form onSubmit={goToDetails} className="mt-9 space-y-6">
              <div>
                <label className="text-sm font-semibold" htmlFor="trip-name">Hoe noem je deze reis? *</label>
                <Input
                  id="trip-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Bijv. Zomer in Italië"
                  className="mt-2 h-12"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Weet je al waarheen?</p>
                    <p className="mt-1 text-xs text-muted-foreground">Mag leeg blijven als de bestemming nog niet vaststaat.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="destination">Bestemming</label>
                    <Input
                      id="destination"
                      value={destination}
                      onChange={(event) => setDestination(event.target.value)}
                      placeholder="Plaats of regio"
                      className="mt-1.5 h-11"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="country">Land</label>
                    <Input
                      id="country"
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      placeholder="Bijv. Italië"
                      className="mt-1.5 h-11"
                    />
                  </div>
                </div>
              </div>

              {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

              <Button type="submit" className="h-12 w-full font-bold">
                Verder <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="mt-9">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{name.trim()}</p>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Wat weet je al?</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Alles hieronder is optioneel. Sla over wat nog niet vaststaat en vul het later aan vanuit je reis.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-6">
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <CalendarDays className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Wanneer ga je?</p>
                    <p className="mt-1 text-xs text-muted-foreground">Laat leeg als de data nog niet gekozen zijn.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="start-date">Van</label>
                    <Input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="end-date">Tot</label>
                    <Input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1.5 h-11" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Wie gaat er mee?</p>
                    <p className="mt-1 text-xs text-muted-foreground">Een soloreis begint gewoon bij 1.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="group-size">Reizigers</label>
                    <Input id="group-size" type="number" min={1} max={99} value={groupSize} onChange={(event) => setGroupSize(event.target.value)} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="currency">Valuta</label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold" htmlFor="description">Iets dat je wilt onthouden?</label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Bijv. rustig tempo, familiebezoek of nog te beslissen"
                  className="mt-2"
                  rows={3}
                />
              </div>

              {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="h-12" onClick={() => { setError(""); setStep(1); }} disabled={submitting}>
                  <ArrowLeft className="mr-2 h-4 w-4" />Terug
                </Button>
                <Button type="submit" className="h-12 flex-1 font-bold" disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Reis starten
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Je kunt al deze gegevens later wijzigen.</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
