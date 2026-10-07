import { FormEvent, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormError, FormField, FormSheet, FormSubmit } from "@/components/FormSheet";
import { createDecisionWithOptions } from "./data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onSaved: () => void | Promise<void>;
};

export function DecisionSheet({ open, onOpenChange, tripId, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setOptions(["", ""]);
    setError("");
  };

  const handleOpenChange = (next: boolean) => {
    if (next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    if (!title.trim()) {
      setError("Geef aan waar jullie over kiezen.");
      return;
    }
    if (cleanOptions.length < 2) {
      setError("Voeg minimaal twee opties toe.");
      return;
    }

    setSaving(true);
    try {
      await createDecisionWithOptions({
        tripId,
        title: title.trim(),
        description: description.trim() || null,
        options: cleanOptions.map((label) => ({ label })),
      });
      await onSaved();
      onOpenChange(false);
      reset();
    } catch (caught) {
      console.error("decision create failed", caught);
      setError("De keuze kon niet worden aangemaakt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Nieuwe keuze"
      description="Zet de vraag en opties klaar. Medereizigers kunnen daarna stemmen."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <FormField label="Waar kiezen jullie over?" htmlFor="decision-title" required>
          <Input id="decision-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Bijv. Welk verblijf kiezen we?" className="h-11" autoFocus />
        </FormField>
        <FormField label="Toelichting" htmlFor="decision-description">
          <Textarea id="decision-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Optioneel: wat moeten mensen meewegen?" />
        </FormField>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-semibold">Opties</label>
            {options.length < 8 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setOptions((current) => [...current, ""])}>
                <Plus className="mr-1 h-3.5 w-3.5" />Optie
              </Button>
            )}
          </div>
          <div className="mt-2 space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option}
                  onChange={(event) => setOptions((current) => current.map((value, currentIndex) => currentIndex === index ? event.target.value : value))}
                  placeholder={`Optie ${index + 1}`}
                  className="h-11"
                />
                {options.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground" onClick={() => setOptions((current) => current.filter((_, currentIndex) => currentIndex !== index))} aria-label="Optie verwijderen">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        <FormError message={error} />
        <FormSubmit saving={saving}>Keuze starten</FormSubmit>
      </form>
    </FormSheet>
  );
}
