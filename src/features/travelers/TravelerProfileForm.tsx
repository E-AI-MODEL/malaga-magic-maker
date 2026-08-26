import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  budgetOptions,
  comfortOptions,
  dietOptions,
  paceOptions,
  priorityOptions,
  type TravelerProfile,
} from "./data";

export type TravelerProfileDraft = {
  priorities: string[];
  diet: string[];
  allergies: string;
  pace: string;
  comfort: string;
  budgetFeel: string;
  mobility: string;
  notes: string;
};

export const emptyTravelerDraft: TravelerProfileDraft = {
  priorities: [],
  diet: [],
  allergies: "",
  pace: "",
  comfort: "",
  budgetFeel: "",
  mobility: "",
  notes: "",
};

export function draftFromProfile(profile: TravelerProfile | undefined): TravelerProfileDraft {
  if (!profile) return emptyTravelerDraft;
  return {
    priorities: profile.priorities || [],
    diet: profile.diet || [],
    allergies: profile.allergies || "",
    pace: profile.pace || "",
    comfort: profile.comfort || "",
    budgetFeel: profile.budget_feel || "",
    mobility: profile.mobility || "",
    notes: profile.notes || "",
  };
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] rounded-full border px-3 text-[13px] font-semibold transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-rule/40 bg-card text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ChipGroup({
  legend,
  hint,
  options,
  values,
  onToggle,
}: {
  legend: string;
  hint?: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="border-t border-rule/20 pt-4">
      <legend className="sr-only">{legend}</legend>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-ui text-[15px] font-semibold">{legend}</p>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip key={option} label={option} active={values.includes(option)} onClick={() => onToggle(option)} />
        ))}
      </div>
    </fieldset>
  );
}

function SingleChoice({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <fieldset className="border-t border-rule/20 pt-4">
      <legend className="sr-only">{legend}</legend>
      <p className="font-ui text-[15px] font-semibold">{legend}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option}
            label={option}
            active={value === option}
            onClick={() => onChange(value === option ? "" : option)}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function TravelerProfileForm({
  value,
  onChange,
  idPrefix = "traveler",
}: {
  value: TravelerProfileDraft;
  onChange: (next: TravelerProfileDraft) => void;
  idPrefix?: string;
}) {
  const toggle = (key: "priorities" | "diet", option: string) => {
    const current = value[key];
    onChange({
      ...value,
      [key]: current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
    });
  };

  return (
    <div className="space-y-5">
      <ChipGroup
        legend="Waar draait deze reis voor jou om?"
        hint="Meerdere mogelijk"
        options={priorityOptions}
        values={value.priorities}
        onToggle={(option) => toggle("priorities", option)}
      />

      <ChipGroup
        legend="Eten en drinken"
        hint="Optioneel"
        options={dietOptions}
        values={value.diet}
        onToggle={(option) => toggle("diet", option)}
      />

      <div className="border-t border-rule/20 pt-4">
        <label className="font-ui text-[15px] font-semibold" htmlFor={`${idPrefix}-allergies`}>
          Allergieën
        </label>
        <Input
          id={`${idPrefix}-allergies`}
          value={value.allergies}
          onChange={(event) => onChange({ ...value, allergies: event.target.value })}
          placeholder="Bijv. noten, schaaldieren"
          className="mt-2 h-11"
        />
      </div>

      <SingleChoice legend="Tempo" options={paceOptions} value={value.pace} onChange={(next) => onChange({ ...value, pace: next })} />
      <SingleChoice
        legend="Comfort"
        options={comfortOptions}
        value={value.comfort}
        onChange={(next) => onChange({ ...value, comfort: next })}
      />
      <SingleChoice
        legend="Budgetgevoel"
        options={budgetOptions}
        value={value.budgetFeel}
        onChange={(next) => onChange({ ...value, budgetFeel: next })}
      />

      <div className="border-t border-rule/20 pt-4">
        <label className="font-ui text-[15px] font-semibold" htmlFor={`${idPrefix}-mobility`}>
          Mobiliteit of toegankelijkheid
        </label>
        <Input
          id={`${idPrefix}-mobility`}
          value={value.mobility}
          onChange={(event) => onChange({ ...value, mobility: event.target.value })}
          placeholder="Bijv. slecht ter been, rolstoel, kinderwagen"
          className="mt-2 h-11"
        />
      </div>

      <div className="border-t border-rule/20 pt-4">
        <label className="font-ui text-[15px] font-semibold" htmlFor={`${idPrefix}-notes`}>
          Waar moeten we rekening mee houden?
        </label>
        <Textarea
          id={`${idPrefix}-notes`}
          value={value.notes}
          onChange={(event) => onChange({ ...value, notes: event.target.value })}
          placeholder="Bijv. graag één rustdag, niet te vroeg vertrekken"
          className="mt-2"
          rows={3}
        />
      </div>
    </div>
  );
}
