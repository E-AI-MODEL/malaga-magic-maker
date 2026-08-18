import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTrip } from "@/contexts/TripContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const currencies = ["EUR", "USD", "GBP", "CHF"];

export default function NewTrip() {
  const { createTrip } = useTrip();
  const navigate = useNavigate();
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Geef je reis een naam.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setError("De einddatum kan niet vóór de startdatum liggen.");
      return;
    }

    setSubmitting(true);
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
    setSubmitting(false);

    if (!trip) {
      setError("De reis kon niet worden aangemaakt. Probeer het opnieuw.");
      return;
    }

    navigate(`/trip/${trip.id}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-5 py-8 sm:py-12">
        <Button asChild variant="ghost" className="-ml-3 mb-6">
          <Link to="/trips">
            <ArrowLeft className="mr-2 h-4 w-4" />Mijn reizen
          </Link>
        </Button>

        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nieuwe reis</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Waar gaat je volgende reis over?</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Begin met wat je al weet. Bestemming en data mogen ook later worden ingevuld.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-semibold" htmlFor="trip-name">Naam van de reis *</label>
            <Input
              id="trip-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bijv. Zomervakantie met het gezin"
              className="mt-2 h-12"
              autoFocus
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold" htmlFor="destination">Bestemming</label>
              <Input
                id="destination"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Plaats of regio"
                className="mt-2 h-12"
              />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="country">Land</label>
              <Input
                id="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="Bijv. Italië"
                className="mt-2 h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold" htmlFor="start-date">Van</label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 h-12"
              />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="end-date">Tot</label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold" htmlFor="group-size">Aantal reizigers</label>
              <Input
                id="group-size"
                type="number"
                min={1}
                max={99}
                value={groupSize}
                onChange={(event) => setGroupSize(event.target.value)}
                className="mt-2 h-12"
              />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="currency">Valuta</label>
              <select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {currencies.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <p className="-mt-3 text-xs text-muted-foreground">Ook een soloreis begint gewoon bij 1.</p>

          <div>
            <label className="text-sm font-semibold" htmlFor="description">Notitie</label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Wat wil je over deze reis onthouden?"
              className="mt-2"
              rows={3}
            />
          </div>

          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" className="h-12 w-full font-bold" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reis aanmaken
          </Button>
        </form>
      </div>
    </div>
  );
}
