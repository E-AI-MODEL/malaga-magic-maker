import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormSheet } from "@/components/FormSheet";
import {
  createItemFromSuggestion,
  dismissDocumentSuggestion,
  extractTripDocument,
  parseBookingText,
  uploadTripDocument,
  validateDocumentFile,
  parseDocumentSuggestion,
  type DocumentSuggestion,
} from "@/features/documents/data";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  onSaved: () => void | Promise<void>;
};

/** Paste a forwarded booking email; Hansie reads it and proposes timeline items. */
export function BookingPasteSheet({ open, onOpenChange, tripId, onSaved }: Props) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([]);
  const [addedKeys, setAddedKeys] = useState<number[]>([]);
  const [savingKey, setSavingKey] = useState<number | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setText("");
    setError("");
    setSummary(null);
    setSuggestions([]);
    setAddedKeys([]);
    setSavingKey(null);
    setDocumentId(null);
    setShowPaste(false);
  }, [open]);

  const scan = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setSummary(null);
    setSuggestions([]);
    setAddedKeys([]);
    try {
      validateDocumentFile(file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Dit bestand werkt niet.");
      return;
    }
    setReading(true);
    try {
      const type = file.type === "application/pdf" ? "booking_confirmation" : "ticket";
      const id = await uploadTripDocument({ tripId, documentType: type, file });
      setDocumentId(id);
      const result = (await extractTripDocument(tripId, id)) as { summary?: string | null; suggestion?: unknown } | null;
      const parsed = parseDocumentSuggestion(result?.suggestion);
      setSummary(result?.summary || null);
      setSuggestions(parsed ? [parsed] : []);
      if (!parsed) setError("Geen boeking gevonden. Het bestand staat wel bij Documenten.");
      await onSaved();
    } catch (cause) {
      console.error("booking scan failed", cause);
      setError("Uitlezen lukte niet. Probeer het opnieuw of plak de tekst.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const read = async () => {
    setReading(true);
    setError("");
    setSummary(null);
    setSuggestions([]);
    setAddedKeys([]);
    try {
      const result = await parseBookingText(tripId, text);
      const parsed = (result.suggestions || [])
        .map((entry) => parseDocumentSuggestion(entry))
        .filter((entry): entry is DocumentSuggestion => Boolean(entry));
      setSummary(result.summary || null);
      setSuggestions(parsed);
      if (parsed.length === 0) setError("Hier staat geen concrete boeking in. Plak de volledige mail met datums en tijden.");
    } catch (cause) {
      console.error("booking parse failed", cause);
      setError("De boeking kon niet worden uitgelezen. Probeer het zo opnieuw.");
    } finally {
      setReading(false);
    }
  };

  const add = async (suggestion: DocumentSuggestion, index: number) => {
    setSavingKey(index);
    setError("");
    try {
      await createItemFromSuggestion(
        tripId,
        suggestion,
        documentId ? "Overgenomen uit een gescande boeking" : "Overgenomen uit een doorgestuurde boeking",
      );
      if (documentId) await dismissDocumentSuggestion(tripId, documentId).catch(() => undefined);
      setAddedKeys((current) => [...current, index]);
      await onSaved();
    } catch (cause) {
      console.error("booking item insert failed", cause);
      setError("Toevoegen aan de tijdlijn lukte niet.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Boeking scannen"
      description="Foto, screenshot of PDF van je ticket of boeking. AI leest het uit, jij checkt het."
    >
      <div className="mt-4 space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            aria-label="Kies foto of PDF"
            onChange={(event) => void scan(event.target.files?.[0])}
          />
          <Button
            type="button"
            size="lg"
            className="h-14 w-full text-base"
            disabled={reading}
            onClick={() => fileRef.current?.click()}
          >
            {reading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" strokeWidth={1.75} />}
            {reading ? "AI leest je boeking…" : "Foto, screenshot of PDF"}
          </Button>
          <p className="text-xs text-muted-foreground">Het bestand komt ook bij Documenten van deze reis, alleen zichtbaar voor reisgenoten.</p>

          {!showPaste ? (
            <button type="button" className="text-sm font-medium underline underline-offset-4" onClick={() => setShowPaste(true)}>
              Of plak de tekst uit je mail
            </button>
          ) : (
          <>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={7}
            placeholder="Plak hier de volledige boekingsmail…"
            className="text-base"
          />

          <Button type="button" variant="outline" onClick={() => void read()} disabled={reading || text.trim().length < 20} className="w-full">
            {reading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {reading ? "AI leest mee…" : "Tekst uitlezen"}
          </Button>
          </>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          {summary && <p className="text-sm text-muted-foreground">{summary}</p>}

          {suggestions.length > 0 && (
            <div className="border-t border-rule">
              {suggestions.map((suggestion, index) => {
                const added = addedKeys.includes(index);
                return (
                  <div key={`${suggestion.title}-${index}`} className="flex items-center gap-3 border-b border-rule py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium leading-tight">{suggestion.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[suggestion.provider, suggestion.start_at, suggestion.booking_reference].filter(Boolean).join(" · ") ||
                          "Zonder datum"}
                      </p>
                    </div>
                    {added ? (
                      <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-muted-foreground">
                        <Check className="h-3.5 w-3.5" strokeWidth={2} />
                        Toegevoegd
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 rounded-full"
                        disabled={savingKey === index}
                        onClick={() => void add(suggestion, index)}
                      >
                        {savingKey === index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Zet op Reis"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </FormSheet>
  );
}
