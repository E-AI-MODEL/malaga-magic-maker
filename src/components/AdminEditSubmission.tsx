import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, X } from "lucide-react";
import type { Submission } from "@/lib/scoring";

const DEFAULT_SUBMISSION: Omit<Submission, "id" | "user_id"> = {
  agreed_facts: false,
  preferred_rounds: 2,
  mobility_choice: "neutral",
  base_choice: "neutral",
  max_golf_minutes: 20,
  require_fixed_beds: false,
  require_bedrooms_3: false,
  require_cancelable: false,
  require_transparent_price: false,
  require_pool: false,
  require_airco: false,
  require_wifi: false,
  require_parking: false,
  require_terrace: false,
  budget_cap_total: null,
  points_golf_ease: 20,
  points_beach_life: 20,
  points_exploring: 20,
  points_luxury: 20,
  points_budget: 10,
  points_low_hassle: 10,
  diet_preferences: [],
  diet_remarks: null,
  activities: [],
  remarks_a: null,
  remarks_b: null,
  locked: false,
};

interface Props {
  submission?: Submission;
  userId?: string;
  displayName: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function AdminEditSubmission({ submission, userId, displayName, onSaved, onCancel }: Props) {
  const isCreate = !submission;
  const [form, setForm] = useState<Omit<Submission, "id" | "user_id"> & { id?: string; user_id?: string }>(
    submission ? { ...submission } : { ...DEFAULT_SUBMISSION }
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      agreed_facts: form.agreed_facts,
      preferred_rounds: form.preferred_rounds,
      mobility_choice: form.mobility_choice,
      base_choice: form.base_choice,
      max_golf_minutes: form.max_golf_minutes,
      require_fixed_beds: form.require_fixed_beds,
      require_bedrooms_3: form.require_bedrooms_3,
      require_cancelable: form.require_cancelable,
      require_transparent_price: form.require_transparent_price,
      require_pool: form.require_pool,
      require_airco: form.require_airco,
      require_wifi: form.require_wifi,
      require_parking: form.require_parking,
      require_terrace: form.require_terrace,
      budget_cap_total: form.budget_cap_total,
      points_golf_ease: form.points_golf_ease,
      points_beach_life: form.points_beach_life,
      points_exploring: form.points_exploring,
      points_luxury: form.points_luxury,
      points_budget: form.points_budget,
      points_low_hassle: form.points_low_hassle,
      diet_preferences: form.diet_preferences,
      diet_remarks: form.diet_remarks,
      activities: form.activities,
      remarks_a: form.remarks_a,
      remarks_b: form.remarks_b,
      locked: form.locked,
    };

    let error;
    if (isCreate && userId) {
      ({ error } = await supabase.from("submissions").insert({ ...payload, user_id: userId }));
    } else if (submission) {
      ({ error } = await supabase.from("submissions").update(payload).eq("id", submission.id));
    }

    setSaving(false);
    if (error) { toast.error("Opslaan mislukt: " + error.message); return; }
    toast.success(`Intake van ${displayName} ${isCreate ? "aangemaakt" : "opgeslagen"}`);
    onSaved();
  };

  const totalPoints = (form.points_golf_ease || 0) + (form.points_beach_life || 0) + (form.points_exploring || 0) +
    (form.points_luxury || 0) + (form.points_budget || 0) + (form.points_low_hassle || 0);

  const RadioRow = ({ label, name, options, value, onChange }: {
    label: string; name: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
  }) => (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
      <div className="flex gap-1.5">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 text-center rounded-md py-2 text-xs font-medium transition-colors ${
              value === opt.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const CheckRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} />
      <span className="text-xs">{label}</span>
    </label>
  );

  const PointsInput = ({ label, field }: { label: string; field: keyof typeof form }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <Input
        type="number"
        min={0}
        max={100}
        value={(form[field] as number) || 0}
        onChange={e => set(field as any, parseInt(e.target.value) || 0)}
        className="h-7 w-16 text-xs"
      />
    </div>
  );

  return (
    <div className="border-2 border-primary/30 rounded-lg p-4 space-y-5 bg-background">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-extrabold text-sm">
          {isCreate ? `Intake aanmaken: ${displayName}` : `Bewerk intake: ${displayName}`}
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
            <X className="h-3.5 w-3.5 mr-1" /> Annuleer
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Opslaan..." : isCreate ? "Aanmaken" : "Opslaan"}
          </Button>
        </div>
      </div>

      {/* Vervoer & Locatie */}
      <RadioRow label="Vervoer" name="mobility" value={form.mobility_choice}
        onChange={v => set("mobility_choice", v)}
        options={[{ value: "car", label: "Huurauto" }, { value: "transfers", label: "Taxi" }, { value: "neutral", label: "Neutraal" }]}
      />
      <RadioRow label="Locatie" name="base" value={form.base_choice}
        onChange={v => set("base_choice", v)}
        options={[{ value: "golf", label: "Golf" }, { value: "beach", label: "Strand" }, { value: "neutral", label: "Neutraal" }]}
      />

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Rondes golf</p>
          <Input type="number" min={0} max={3} value={form.preferred_rounds}
            onChange={e => set("preferred_rounds", parseInt(e.target.value) || 0)} className="h-8 text-xs" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Max golf min</p>
          <Input type="number" min={5} max={60} value={form.max_golf_minutes}
            onChange={e => set("max_golf_minutes", parseInt(e.target.value) || 20)} className="h-8 text-xs" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Budget cap (€)</p>
          <Input type="number" min={0} value={form.budget_cap_total ?? ""}
            onChange={e => set("budget_cap_total", e.target.value ? parseInt(e.target.value) : null)} className="h-8 text-xs" />
        </div>
      </div>

      {/* Must-haves */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Must-haves</p>
        <div className="grid grid-cols-2 gap-2">
          <CheckRow label="Vaste bedden" checked={form.require_fixed_beds} onChange={v => set("require_fixed_beds", v)} />
          <CheckRow label="3 slaapkamers" checked={form.require_bedrooms_3} onChange={v => set("require_bedrooms_3", v)} />
          <CheckRow label="Zwembad" checked={form.require_pool} onChange={v => set("require_pool", v)} />
          <CheckRow label="Airco" checked={form.require_airco} onChange={v => set("require_airco", v)} />
          <CheckRow label="Wifi" checked={form.require_wifi} onChange={v => set("require_wifi", v)} />
          <CheckRow label="Parking" checked={form.require_parking} onChange={v => set("require_parking", v)} />
          <CheckRow label="Terras" checked={form.require_terrace} onChange={v => set("require_terrace", v)} />
          <CheckRow label="Transparante prijs" checked={form.require_transparent_price} onChange={v => set("require_transparent_price", v)} />
          <CheckRow label="Annuleerbaar" checked={form.require_cancelable} onChange={v => set("require_cancelable", v)} />
        </div>
      </div>

      {/* Punten */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Punten (totaal: <span className={totalPoints === 100 ? "text-primary" : "text-destructive"}>{totalPoints}/100</span>)
        </p>
        <div className="space-y-1.5">
          <PointsInput label="Golf" field="points_golf_ease" />
          <PointsInput label="Strand" field="points_beach_life" />
          <PointsInput label="Omgeving" field="points_exploring" />
          <PointsInput label="Luxe" field="points_luxury" />
          <PointsInput label="Budget" field="points_budget" />
          <PointsInput label="Gedoe" field="points_low_hassle" />
        </div>
      </div>

      {/* Locked toggle */}
      <CheckRow label="Locked (meegenomen in berekeningen)" checked={form.locked} onChange={v => set("locked", v)} />
    </div>
  );
}
