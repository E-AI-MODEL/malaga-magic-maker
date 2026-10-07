import { FormEvent, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { FormError, FormField, FormSelect, FormSheet, FormSubmit } from "@/components/FormSheet";
import type { TripItemRow } from "@/integrations/supabase/database";
import { describePlanLimit } from "@/features/pro/limits";
import { documentTypes, uploadTripDocument, validateDocumentFile } from "./data";

export function DocumentUploadSheet({
  open,
  onOpenChange,
  tripId,
  items,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  items: TripItemRow[];
  onUploaded: () => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("booking_confirmation");
  const [tripItemId, setTripItemId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setDocumentType("booking_confirmation");
    setTripItemId("");
    setError("");
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("Kies eerst een document.");
      return;
    }

    try {
      validateDocumentFile(file);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dit bestand kan niet worden toegevoegd.");
      return;
    }

    setSaving(true);
    try {
      await uploadTripDocument({
        tripId,
        tripItemId: tripItemId || null,
        documentType,
        file,
      });
      await onUploaded();
      onOpenChange(false);
    } catch (caught) {
      console.error("document upload failed", caught);
      setError(describePlanLimit(caught) ?? "Uploaden is niet gelukt. Probeer het nog een keer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Document toevoegen"
      description="Bewaar een bevestiging, ticket of voucher veilig bij deze reis."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <FormField label="Bestand" htmlFor="document-file" required>
          <label htmlFor="document-file" className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/35 px-4 py-5 hover:bg-secondary/55">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 text-sm">
              <span className="block truncate font-medium text-foreground">{file?.name || "Kies PDF of afbeelding"}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">PDF, JPG, PNG of WebP · maximaal 20 MB</span>
            </span>
          </label>
          <input
            id="document-file"
            type="file"
            className="sr-only"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError("");
            }}
          />
        </FormField>

        <FormField label="Soort document" htmlFor="document-type">
          <FormSelect
            id="document-type"
            value={documentType}
            onChange={setDocumentType}
            options={documentTypes.map((option) => ({ value: option.value, label: option.label }))}
          />
        </FormField>

        <FormField
          label="Hoort bij"
          htmlFor="document-trip-item"
          hint="Koppel bijvoorbeeld een boardingpass aan de vlucht of een voucher aan het verblijf."
        >
          <FormSelect
            id="document-trip-item"
            value={tripItemId}
            onChange={setTripItemId}
            options={[
              { value: "", label: "Algemeen voor deze reis" },
              ...items.map((item) => ({ value: item.id, label: item.title })),
            ]}
          />
        </FormField>

        <FormError message={error} />
        <FormSubmit saving={saving}>Veilig toevoegen</FormSubmit>
      </form>
    </FormSheet>
  );
}
