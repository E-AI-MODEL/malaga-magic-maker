import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepChip, StepError, StepNext, StepQuestion, StepSheet, StepSummary, useStepFlow } from "@/components/steps";
import { createDecisionWithOptions } from "./data";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; tripId: string; onSaved: () => void | Promise<void> };
type Step = "question" | "options" | "summary";
const SUGGESTIONS = ["Waar verblijven we?", "Waar gaan we eten?", "Wat gaan we doen?", "Hoe reizen we?", "Wanneer vertrekken we?"];

export const cleanDecisionOptions = (options: string[]) => [...new Set(options.map((o) => o.trim()).filter(Boolean))];

export function DecisionWizard({ open, onOpenChange, tripId, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const clean = cleanDecisionOptions(options);
  const steps: Step[] = ["question", "options", "summary"];
  const flow = useStepFlow<Step>(steps, { question: Boolean(title.trim()), options: clean.length >= 2 }, "summary");

  useEffect(() => {
    if (!open) return;
    setTitle(""); setOptions(["", ""]); setError(""); setSaving(false); flow.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    if (saving || !flow.complete) return;
    setSaving(true); setError("");
    try {
      await createDecisionWithOptions({ tripId, title: title.trim(), description: null, options: clean.map((label) => ({ label })) });
      await onSaved();
      onOpenChange(false);
    } catch { setError("De keuze kon niet worden gestart. Probeer het opnieuw."); }
    finally { setSaving(false); }
  };

  return (
    <StepSheet open={open} onOpenChange={onOpenChange} title="Nieuwe keuze" total={steps.length} index={flow.index} onBack={flow.back} onSwipeNext={flow.step !== "summary" ? flow.next : undefined}>
      {flow.step === "question" && <form onSubmit={(e: FormEvent) => { e.preventDefault(); flow.next(); }}>
        <StepQuestion sub="De anderen stemmen daarna mee.">Waar kiezen jullie over?</StepQuestion>
        <Input aria-label="Vraag" autoFocus value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="Typ je vraag" className="h-16 rounded-2xl text-xl" />
        <div className="mt-4 flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <StepChip key={s} selected={title === s} onClick={() => { setTitle(s); flow.go(flow.backToSummary ? "summary" : "options"); }}>{s}</StepChip>)}</div>
        <StepNext disabled={!title.trim()}>{flow.backToSummary ? "Klaar" : "Volgende"}</StepNext>
      </form>}

      {flow.step === "options" && <form onSubmit={(e: FormEvent) => { e.preventDefault(); flow.next(); }}>
        <StepQuestion sub="Minstens twee.">Welke opties zijn er?</StepQuestion>
        <div className="space-y-2.5">
          {options.map((option, index) => <div key={index} className="flex gap-2">
            <Input aria-label={`Optie ${index + 1}`} autoFocus={index === 0} value={option} maxLength={120} onChange={(e) => setOptions((c) => c.map((v, i) => (i === index ? e.target.value : v)))} placeholder={`Optie ${index + 1}`} className="h-14 flex-1 rounded-2xl text-lg" />
            {options.length > 2 && <Button type="button" variant="ghost" size="icon" className="h-14 w-14 rounded-2xl text-muted-foreground" aria-label={`Optie ${index + 1} weghalen`} onClick={() => setOptions((c) => c.filter((_, i) => i !== index))}><Trash2 className="h-5 w-5" /></Button>}
          </div>)}
        </div>
        {options.length < 8 && <Button type="button" variant="outline" className="mt-3 h-14 w-full rounded-2xl text-base font-semibold" onClick={() => setOptions((c) => [...c, ""])}><Plus className="mr-2 h-5 w-5" />Nog een optie</Button>}
        <StepNext disabled={clean.length < 2}>{flow.backToSummary ? "Klaar" : "Volgende"}</StepNext>
      </form>}

      {flow.step === "summary" && <div className="space-y-5">
        <StepQuestion>Klopt dit?</StepQuestion>
        <StepSummary rows={[
          { label: "Vraag", value: title, onEdit: () => flow.edit("question") },
          { label: "Opties", value: clean.join(" · "), onEdit: () => flow.edit("options") },
        ]} />
        <StepNext onClick={() => void save()} busy={saving} disabled={!flow.complete} done>Keuze starten</StepNext>
      </div>}
      <StepError message={error} />
    </StepSheet>
  );
}
