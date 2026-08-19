import { FormEvent, useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-5 pb-8 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl font-extrabold">Document toevoegen</SheetTitle>
          <SheetDescription>Bewaar een bevestiging, ticket, voucher of ander reispapier veilig bij deze reis.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="document-file" className="text-sm font-semibold">Bestand *</label>
            <label htmlFor="document-file" className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/35 px-4 py-5 hover:bg-secondary/55">
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
          </div>

          <div>
            <label htmlFor="document-type" className="text-sm font-semibold">Soort document</label>
            <select
              id="document-type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="document-trip-item" className="text-sm font-semibold">Hoort bij</label>
            <select
              id="document-trip-item"
              value={tripItemId}
              onChange={(event) => setTripItemId(event.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Algemeen voor deze reis</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">Koppel bijvoorbeeld een boardingpass aan de vlucht of een voucher aan het verblijf.</p>
          </div>

          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" className="h-12 w-full font-bold" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Veilig toevoegen
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
