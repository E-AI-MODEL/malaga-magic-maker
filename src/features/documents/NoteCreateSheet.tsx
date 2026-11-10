import { useState } from "react";
import { FormError, FormField, FormSheet, FormSubmit } from "@/components/FormSheet";
import { Textarea } from "@/components/ui/textarea";
import { describePlanLimit } from "@/features/pro/limits";
import { uploadTripDocument } from "./data";
import { createNoteFile, type NoteKind } from "./note-file";

export function NoteCreateSheet({ kind, tripId, onClose, onSaved }: {
  kind: NoteKind; tripId: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const packing = kind === "packing";
  return (
    <FormSheet open onOpenChange={(open) => { if (!open && !saving) onClose(); }} title={packing ? "Paklijst maken" : "Notitie schrijven"}>
      <form className="mt-4 space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setSaving(true);
        try {
          const file = createNoteFile(kind, text);
          await uploadTripDocument({ tripId, documentType: "other", file });
          await onSaved();
          onClose();
        } catch (caught) {
          setError(describePlanLimit(caught) ?? (caught instanceof Error && caught.message === "Vul je lijst of notitie in." ? caught.message : "Opslaan is niet gelukt. Probeer het opnieuw."));
        } finally { setSaving(false); }
      }}>
        <FormField htmlFor="note-text" label={packing ? "Wat neem je mee?" : "Schrijf je notitie"} hint={packing ? "Eén ding per regel." : undefined}>
          <Textarea id="note-text" value={text} onChange={(event) => setText(event.target.value)} className="h-[min(32dvh,240px)] resize-none" disabled={saving} placeholder={packing ? "Zonnebril\nOplader\nZwemkleding" : "Typ hier…"} />
        </FormField>
        <FormError message={error} />
        <FormSubmit saving={saving}>Opslaan</FormSubmit>
      </form>
    </FormSheet>
  );
}