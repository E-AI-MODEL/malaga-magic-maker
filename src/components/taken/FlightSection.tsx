import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plane, ChevronDown } from "lucide-react";
import type { TravelLeg } from "./types";

interface FlightSectionProps {
  travelLegs: TravelLeg[];
  isAdmin: boolean;
  onLegUpdate: (legId: string, updates: Partial<TravelLeg>) => void;
}

export function FlightSection({ travelLegs, isAdmin, onLegUpdate }: FlightSectionProps) {
  const [flightsOpen, setFlightsOpen] = useState(false);
  const [editingLeg, setEditingLeg] = useState<string | null>(null);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
  };

  return (
    <Collapsible open={flightsOpen} onOpenChange={setFlightsOpen}>
      <section className="border-b border-border px-6 py-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full bg-secondary/50 rounded-lg px-3 py-2.5 hover:bg-secondary/80 transition-colors">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Vluchtgegevens</p>
          </div>
          <ChevronDown className={`h-5 w-5 text-primary transition-transform ${flightsOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-2 mt-4">
            {travelLegs.map(leg => (
              <Card key={leg.id} className="border-border/60">
                <CardContent className="p-3">
                  {editingLeg === leg.id && isAdmin ? (
                    <TravelLegEditor leg={leg} onSave={(u) => { onLegUpdate(leg.id, u); setEditingLeg(null); }} onCancel={() => setEditingLeg(null)} />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-display font-bold text-sm">{leg.passengers.join(", ")}</p>
                        {leg.note ? (
                          <p className="text-xs text-muted-foreground mt-0.5">{leg.note}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(leg.travel_date)} · {leg.departure_time} → {leg.arrival_time}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingLeg(leg.id)}>
                          Bewerken
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

function TravelLegEditor({ leg, onSave, onCancel }: {
  leg: TravelLeg;
  onSave: (updates: Partial<TravelLeg>) => void;
  onCancel: () => void;
}) {
  const [passengers, setPassengers] = useState(leg.passengers.join(", "));
  const [dep, setDep] = useState(leg.departure_time || "");
  const [arr, setArr] = useState(leg.arrival_time || "");
  const [date, setDate] = useState(leg.travel_date || "");
  const [note, setNote] = useState(leg.note || "");

  return (
    <div className="space-y-2">
      <Input value={passengers} onChange={e => setPassengers(e.target.value)} placeholder="Passagiers (komma-gescheiden)" className="text-xs h-8" />
      <div className="grid grid-cols-3 gap-2">
        <Input value={dep} onChange={e => setDep(e.target.value)} placeholder="Vertrek" className="text-xs h-8" />
        <Input value={arr} onChange={e => setArr(e.target.value)} placeholder="Aankomst" className="text-xs h-8" />
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs h-8" />
      </div>
      <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Notitie (optioneel)" className="text-xs h-8" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={() => onSave({
          passengers: passengers.split(",").map(s => s.trim()).filter(Boolean),
          departure_time: dep || null,
          arrival_time: arr || null,
          travel_date: date || null,
          note: note || null,
        })}>Opslaan</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Annuleren</Button>
      </div>
    </div>
  );
}
