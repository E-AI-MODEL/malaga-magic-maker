import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { ArrowRight, Check } from "lucide-react";
import heroGolf from "@/assets/hero-golf.jpg";

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
          golfEase: data.points_golf_ease, beachLife: data.points_beach_life,
          exploring: data.points_exploring, luxury: data.points_luxury,
          budget: data.points_budget, lowHassle: data.points_low_hassle,
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
      user_id: user.id, agreed_facts: agreedFacts, preferred_rounds: preferredRounds,
      remarks_a: remarksA || null, mobility_choice: mobilityChoice, base_choice: baseChoice,
      max_golf_minutes: maxGolfMinutes, require_fixed_beds: requireFixedBeds,
      require_bedrooms_3: requireBedrooms3, require_cancelable: requireCancelable,
      require_transparent_price: requireTransparentPrice,
      budget_cap_total: budgetCap ? Number(budgetCap) : null, remarks_b: remarksB || null,
      points_golf_ease: points.golfEase, points_beach_life: points.beachLife,
      points_exploring: points.exploring, points_luxury: points.luxury,
      points_budget: points.budget, points_low_hassle: points.lowHassle, locked: true,
    };
    let error;
    if (existingId) {
      ({ error } = await supabase.from("submissions").update(payload).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("submissions").insert(payload));
    }
    if (error) { toast.error("Opslaan mislukt: " + error.message); }
    else { toast.success("Intake opgeslagen en gelocked!"); setLocked(true); }
    setSubmitting(false);
  };

  if (loading) return <AppLayout><div className="flex justify-center py-12 text-sm text-muted-foreground">Laden...</div></AppLayout>;

  if (locked) {
    return (
      <AppLayout>
        <div className="-mx-4 -mt-6">
          <div className="relative h-[60vh] flex items-center justify-center">
            <img src={heroGolf} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 text-center px-6">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary mb-4">
                <Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-white">Intake ingevuld</h2>
              <p className="text-white/60 text-sm mt-2">Je antwoorden zijn opgeslagen en gelocked.</p>
              <Button onClick={() => navigate("/accommodations")} className="mt-6 gap-2">
                Bekijk verblijven <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const RadioOption = ({ name, value, current, onChange, label }: { name: string; value: ChoiceValue; current: ChoiceValue; onChange: (v: any) => void; label: string }) => (
    <label className={`flex items-center gap-3 p-3.5 rounded-lg cursor-pointer transition-all ${current === value ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="hidden" />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );

  const pointLabels: Record<string, string> = {
    golfEase: "Golf gemak",
    beachLife: "Strand & avondleven",
    exploring: "Omgeving ontdekken",
    luxury: "Comfort & luxe",
    budget: "Budget laag houden",
    lowHassle: "Gemak & ontzorging",
  };

  return (
    <AppLayout>
      <div className="-mx-4 -mt-6 space-y-0">
        {/* Hero header */}
        <div className="relative h-40">
          <img src={heroGolf} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
          <div className="relative z-10 flex items-end h-full px-6 pb-5">
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.2em]">Intake</p>
              <h2 className="font-display text-2xl font-extrabold text-white mt-1">Jouw voorkeuren</h2>
            </div>
          </div>
        </div>

        {/* Block A */}
        <section className="bg-foreground text-background px-6 py-8 space-y-5">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-display font-extrabold text-sm">A</div>
              <h3 className="font-display font-extrabold text-base text-white">Vaste gegevens</h3>
            </div>
            <p className="text-white/50 text-sm mb-4">2 – 5 april 2026 &middot; 5 volwassenen &middot; min. 2x golf La Cala</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={agreedFacts} onCheckedChange={(c) => setAgreedFacts(!!c)} className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
            <span className="text-sm text-white/80">Ik ga akkoord met de vaste gegevens</span>
          </label>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Hoeveel rondes golf?</p>
            <div className="grid grid-cols-2 gap-2">
              <RadioOption name="rounds" value={2} current={preferredRounds} onChange={setPreferredRounds} label="2 rondes" />
              <RadioOption name="rounds" value={3} current={preferredRounds} onChange={setPreferredRounds} label="3 rondes" />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5">Opmerking</p>
            <Textarea value={remarksA} onChange={e => setRemarksA(e.target.value)} placeholder="Optioneel..." className="bg-white/10 border-white/15 text-white placeholder:text-white/30 min-h-[60px]" />
          </div>
        </section>

        {/* Block B */}
        <section className="bg-background px-6 py-8 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-destructive text-white flex items-center justify-center font-display font-extrabold text-sm">B</div>
            <h3 className="font-display font-extrabold text-base">Kill criteria</h3>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mobiliteit</p>
            <div className="space-y-2">
              <RadioOption name="mobility" value="car" current={mobilityChoice} onChange={setMobilityChoice} label="Huurauto" />
              <RadioOption name="mobility" value="transfers" current={mobilityChoice} onChange={setMobilityChoice} label="Transfers + taxi's" />
              <RadioOption name="mobility" value="neutral" current={mobilityChoice} onChange={setMobilityChoice} label="Geen voorkeur" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base locatie</p>
            <div className="space-y-2">
              <RadioOption name="base" value="golf" current={baseChoice} onChange={setBaseChoice} label="Golf-base (La Cala Golf)" />
              <RadioOption name="base" value="beach" current={baseChoice} onChange={setBaseChoice} label="Strand-base (La Cala / Calahonda)" />
              <RadioOption name="base" value="neutral" current={baseChoice} onChange={setBaseChoice} label="Geen voorkeur" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max reistijd golf</p>
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
              <label key={i} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                <Checkbox checked={item.checked} onCheckedChange={(c) => item.onChange(!!c)} />
                <span className="text-sm font-medium">{item.label}</span>
              </label>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Budget cap (optioneel)</p>
            <Input type="number" value={budgetCap} onChange={e => setBudgetCap(e.target.value)} placeholder="Max totaalprijs in EUR" className="h-11" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Opmerking</p>
            <Textarea value={remarksB} onChange={e => setRemarksB(e.target.value)} placeholder="Optioneel..." className="min-h-[60px]" />
          </div>
        </section>

        {/* Block C */}
        <section className="bg-foreground text-background px-6 py-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center font-display font-extrabold text-sm text-white">C</div>
            <h3 className="font-display font-extrabold text-base text-white">100 punten verdelen</h3>
          </div>
          <p className="text-white/50 text-sm">Verdeel exact 100 punten. Wat vind jij het belangrijkst?</p>

          <div className={`text-center py-4 rounded-xl font-display text-3xl font-extrabold ${totalPoints === 100 ? "text-primary bg-primary/10" : "text-red-400 bg-red-400/10"}`}>
            {totalPoints}<span className="text-lg text-white/30 ml-1">/100</span>
          </div>

          {Object.entries(pointLabels).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-white/70">{label}</span>
                <span className="font-display font-extrabold text-primary tabular-nums">{points[key as keyof typeof points]}</span>
              </div>
              <Slider
                value={[points[key as keyof typeof points]]}
                onValueChange={([v]) => setPoint(key, v)}
                max={100} step={1}
                className="py-1"
              />
            </div>
          ))}
        </section>

        {/* Submit */}
        <div className="px-6 py-6 bg-background">
          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-14 font-bold text-base" size="lg">
            {submitting ? "Opslaan..." : "Opslaan & locken"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
