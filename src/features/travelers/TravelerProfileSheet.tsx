import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { saveTravelerProfile, type TravelerProfile } from "./data";
import { draftFromProfile, TravelerProfileForm, type TravelerProfileDraft } from "./TravelerProfileForm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  userId: string;
  profile?: TravelerProfile;
  onSaved: () => void | Promise<void>;
};

export function TravelerProfileSheet({ open, onOpenChange, tripId, userId, profile, onSaved }: Props) {
  const [draft, setDraft] = useState<TravelerProfileDraft>(() => draftFromProfile(profile));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(draftFromProfile(profile));
      setError("");
    }
  }, [open, profile]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await saveTravelerProfile({
        tripId,
        userId,
        priorities: draft.priorities,
        diet: draft.diet,
        allergies: draft.allergies,
        pace: draft.pace,
        comfort: draft.comfort,
        budgetFeel: draft.budgetFeel,
        mobility: draft.mobility,
        notes: draft.notes,
      });
      await onSaved();
      onOpenChange(false);
    } catch (caught) {
      console.error("traveler profile save failed", caught);
      setError("Je wensen konden niet worden opgeslagen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Jouw wensen voor deze reis</SheetTitle>
          <SheetDescription>
            Hansie gebruikt dit bij suggesties, zoeken naar verblijf en planning. Alles is optioneel.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-5 pb-8">
          <TravelerProfileForm value={draft} onChange={setDraft} idPrefix="sheet" />

          {error && <p className="mt-4 text-sm font-medium text-destructive">{error}</p>}

          <div className="mt-6 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
