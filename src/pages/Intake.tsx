import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, ArrowRight } from "lucide-react";

type ChoiceValue = string | number | boolean;

export default function Intake() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locked, setLocked] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [agreedFacts, setAgreedFacts] = useState(false);
  const [preferredRounds, setPreferredRounds] = useState<2 | 3>(2);
  const [remarksA, setRemarksA] = useState("");
  const [mobilityChoice, setMobilityChoice] = useState("neutral");
  const [baseChoice, setBaseChoice] = useState("neutral");
  const [maxGolfMinutes, setMaxGolfMinutes] = useState<10 | 15 | 20>(20);
  const [requireFixedBeds, setRequireFixedBeds] = useState(false);
  const [requireBedrooms3, setRequireBedrooms3] = useState(false);
  const [requireCancelable, setRequireCancelable] = useState(false);
  const [requireTransparentPrice, setRequireTransparentPrice] = useState(false);
  const [budgetCap, setBudgetCap] = useState("");
  const [remarksB, setRemarksB] = useState("");

  const [points, setPoints] = useState({
    golfEase: 17, beachLife: 17, exploring: 17, luxury: 17, budget: 16, lowHassle: 16
  });
  const totalPoints = Object.values(points).reduce((a, b) => a + b, 0);

  const setPoint = (key: string, value: number) => {
    setPoints(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, value)) }));
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("submissions").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setExistingId(data.id);
        setLocked(data.locked);
        setAgreedFacts(data.agreed_facts);
        setPreferredRounds(data.preferred_rounds as 2 | 3);
        setRemarksA(data.remarks_a || "");
        setMobilityChoice(data.mobility_choice);
        setBaseChoice(data.base_choice);
        setMaxGolfMinutes(data.max_golf_minutes as 10 | 15 | 20);
        setRequireFixedBeds(data.require_fixed_beds);
        setRequireBedrooms3(data.require_bedrooms_3);
        setRequireCancelable(data.require_cancelable);
        setRequireTransparentPrice(data.require_transparent_price);
        setBudgetCap(data.budget_cap_total?.toString() || "");
        setRemarksB(data.remarks_b || "");
        setPoints({
          golfEase: data.points_golf_ease,
          beachLife: data.points_beach_life,
          exploring: data.points_exploring,
          luxury: data.points_luxury,
          budget: data.points_budget,
          lowHassle: data.points_low_hassle,
        });
      }
      setLoading(false);
    });
  }, [user]);

  const handleSubmit = async () => {
    if (!agreedFacts) { toast.error("Je moet akkoord gaan met de vaste gegevens"); return; }
    if (totalPoints !== 100) { toast.error(`Verdeel exact 100 punten (nu: ${totalPoints})`); return; }
    if (!user) return;

    setSubmitting(true);
    const payload = {
      user_id: user.id,
      agreed_facts: agreedFacts,
      preferred_rounds: preferredRounds,
      remarks_a: remarksA || null,
      mobility_choice: mobilityChoice,
      base_choice: baseChoice,
      max_golf_minutes: maxGolfMinutes,
      require_fixed_beds: requireFixedBeds,
      require_bedrooms_3: requireBedrooms3,
      require_cancelable: requireCancelable,
      require_transparent_price: requireTransparentPrice,
      budget_cap_total: budgetCap ? Number(budgetCap) : null,
      remarks_b: remarksB || null,
      points_golf_ease: points.golfEase,
      points_beach_life: points.beachLife,
      points_exploring: points.exploring,
      points_luxury: points.luxury,
      points_budget: points.budget,
      points_low_hassle: points.lowHassle,
      locked: true,
    };

    let error;
    if (existingId) {
      ({ error } = await supabase.from("submissions").update(payload).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("submissions").insert(payload));
    }

    if (error) {
      toast.error("Opslaan mislukt: " + error.message);
    } else {
      toast.success("Intake opgeslagen en gelocked!");
      setLocked(true);
    }
    setSubmitting(false);
  };

  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;

  if (locked) {
    return (
      <AppLayout>
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-xl font-extrabold">Intake ingevuld</h2>
          <p className="text-muted-foreground text-sm">Je antwoorden zijn opgeslagen en gelocked.</p>
          <Button onClick={() => navigate("/accommodations")} className="gap-2">
            Bekijk verblijven <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </AppLayout>
    );
  }

  const RadioOption = ({ name, value, current, onChange, label }: { name: string; value: ChoiceValue; current: ChoiceValue; onChange: (v: any) => void; label: string }) => (
    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${current === value ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"}`}>
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="accent-primary" />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );

  const pointLabels: Record<string, string> = {
    golfEase: "Golf gemak",
    beachLife: "Strand & avondleven",
    exploring: "Omgeving ontdekken",
    luxury: "Comfort & luxe",
    budget: "Budget laag",
    lowHassle: "Minimaal gedoe",
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Intake</p>
          <h2 className="font-display text-xl font-extrabold">Vul je voorkeuren in</h2>
          <p className="text-sm text-muted-foreground mt-1">Alles in één keer. Na submit wordt het gelocked.</p>
        </div>

        {/* Block A */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xs">A</div>
            <h3 className="font-display font-bold text-sm">Vaste gegevens</h3>
          </div>
          <div className="bg-secondary rounded-lg p-3 text-sm text-muted-foreground">
            <p>2–5 april 2026 · 5 volwassenen · min. 2x golf La Cala</p>
            <p>Robin, Mark, Dimitri (do ochtend) · Edwin, Hans (do middag)</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={agreedFacts} onCheckedChange={(c) => setAgreedFacts(!!c)} className="mt-0.5" />
            <span className="text-sm">Ik ga akkoord met de vaste gegevens</span>
          </label>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hoeveel rondes golf verwacht je?</Label>
            <div className="grid grid-cols-2 gap-2">
              <RadioOption name="rounds" value={2} current={preferredRounds} onChange={setPreferredRounds} label="2 rondes" />
              <RadioOption name="rounds" value={3} current={preferredRounds} onChange={setPreferredRounds} label="3 rondes" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opmerking (optioneel)</Label>
            <Textarea value={remarksA} onChange={e => setRemarksA(e.target.value)} placeholder="..." className="mt-1.5" />
          </div>
        </section>

        <div className="border-t" />

        {/* Block B */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xs">B</div>
            <h3 className="font-display font-bold text-sm">Kill criteria</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobiliteit</Label>
            <div className="space-y-2">
              <RadioOption name="mobility" value="car" current={mobilityChoice} onChange={setMobilityChoice} label="Huurauto" />
              <RadioOption name="mobility" value="transfers" current={mobilityChoice} onChange={setMobilityChoice} label="Transfers + taxi's" />
              <RadioOption name="mobility" value="neutral" current={mobilityChoice} onChange={setMobilityChoice} label="Geen voorkeur" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base locatie</Label>
            <div className="space-y-2">
              <RadioOption name="base" value="golf" current={baseChoice} onChange={setBaseChoice} label="Golf-base (La Cala Golf)" />
              <RadioOption name="base" value="beach" current={baseChoice} onChange={setBaseChoice} label="Strand-base (La Cala de Mijas / Calahonda)" />
              <RadioOption name="base" value="neutral" current={baseChoice} onChange={setBaseChoice} label="Geen voorkeur" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max reistijd naar La Cala Golf</Label>
            <div className="grid grid-cols-3 gap-2">
              <RadioOption name="golfMin" value={10} current={maxGolfMinutes} onChange={setMaxGolfMinutes} label="10 min" />
              <RadioOption name="golfMin" value={15} current={maxGolfMinutes} onChange={setMaxGolfMinutes} label="15 min" />
              <RadioOption name="golfMin" value={20} current={maxGolfMinutes} onChange={setMaxGolfMinutes} label="20 min" />
            </div>
          </div>

          <div className="space-y-3">
            {[
              { checked: requireFixedBeds, onChange: setRequireFixedBeds, label: "5 vaste bedden vereist" },
              { checked: requireBedrooms3, onChange: setRequireBedrooms3, label: "3 slaapkamers vereist" },
              { checked: requireCancelable, onChange: setRequireCancelable, label: "Annuleerbaar vereist" },
              { checked: requireTransparentPrice, onChange: setRequireTransparentPrice, label: "Transparante prijs vereist" },
            ].map((item, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={item.checked} onCheckedChange={(c) => item.onChange(!!c)} />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget cap totaal (optioneel, €)</Label>
            <Input type="number" value={budgetCap} onChange={e => setBudgetCap(e.target.value)} placeholder="bijv. 1500" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opmerking (optioneel)</Label>
            <Textarea value={remarksB} onChange={e => setRemarksB(e.target.value)} placeholder="..." className="mt-1.5" />
          </div>
        </section>

        <div className="border-t" />

        {/* Block C */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xs">C</div>
            <h3 className="font-display font-bold text-sm">100 punten verdelen</h3>
          </div>
          <p className="text-sm text-muted-foreground">Verdeel exact 100 punten over 6 factoren. Wat vind jij het belangrijkst?</p>
          
          <div className={`text-center py-3 rounded-lg font-display text-2xl font-extrabold ${totalPoints === 100 ? "text-primary bg-primary/5" : "text-destructive bg-destructive/5"}`}>
            {totalPoints} / 100
          </div>

          {Object.entries(pointLabels).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="font-display font-bold tabular-nums text-primary">{points[key as keyof typeof points]}</span>
              </div>
              <Slider
                value={[points[key as keyof typeof points]]}
                onValueChange={([v]) => setPoint(key, v)}
                max={100}
                step={1}
                className="py-1"
              />
            </div>
          ))}
        </section>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 font-semibold text-base" size="lg">
          {submitting ? "Opslaan..." : "Opslaan & locken"}
        </Button>
      </div>
    </AppLayout>
  );
}
