import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormSheet } from "@/components/FormSheet";
import {
  createItemFromSuggestion,
  parseBookingText,
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

  useEffect(() => {
    if (open) return;
    setText("");
    setError("");
    setSummary(null);
    setSuggestions([]);
    setAddedKeys([]);
    setSavingKey(null);
  }, [open]);

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
      await createItemFromSuggestion(tripId, suggestion, "Overgenomen uit een doorgestuurde boeking");
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
      title="Boeking doorsturen"
      description="Plak de tekst van je boekingsmail. Hansie leest vluchten, verblijf en huurauto's eruit en zet ze op de tijdlijn."
    >
      <div className="mt-4 space-y-4">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={7}
            placeholder="Plak hier de volledige boekingsmail…"
            className="text-base"
          />

          <Button type="button" onClick={() => void read()} disabled={reading || text.trim().length < 20} className="w-full">
            {reading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {reading ? "Hansie leest mee…" : "Uitlezen"}
          </Button>

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
                        {savingKey === index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Toevoegen"}
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
