import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ClipboardList, Download, FilePlus2, FileText, Loader2, Pencil, Plus, ScanLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TripItemRow } from "@/integrations/supabase/database";
import {
  acceptDocumentSuggestion,
  createTripDocumentSignedUrl,
  deleteTripDocument,
  dismissDocumentSuggestion,
  extractTripDocument,
  getDocumentTypeLabel,
  listTripDocuments,
  parseDocumentSuggestion,
  type TripDocumentRow,
} from "./data";
import { DocumentUploadSheet } from "./DocumentUploadSheet";
import { IconBubble, SuggestionRow } from "@/components/primitives";
import { FormSheet } from "@/components/FormSheet";
import { NoteCreateSheet } from "./NoteCreateSheet";
import type { NoteKind } from "./note-file";

function formatSize(value: number | null) {
  if (!value) return null;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMoment(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function DocumentsSection({
  tripId,
  items,
  currentUserId,
  isOrganizer,
  readOnly,
}: {
  tripId: string;
  items: TripItemRow[];
  currentUserId?: string;
  isOrganizer: boolean;
  readOnly: boolean;
}) {
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [noteKind, setNoteKind] = useState<NoteKind | null>(null);
  const [actionError, setActionError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const startedRef = useRef<Set<string>>(new Set());

  const documentsQuery = useQuery({
    queryKey: ["trip-documents", tripId],
    queryFn: () => listTripDocuments(tripId),
    enabled: Boolean(tripId),
  });

  const documents = documentsQuery.data || [];
  const itemTitles = new Map(items.map((item) => [item.id, item.title]));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["trip-documents", tripId] });
  };

  const runExtraction = async (document: TripDocumentRow) => {
    setBusyId(document.id);
    try {
      await extractTripDocument(tripId, document.id);
      await refresh();
    } catch (error) {
      console.error("document extraction failed", error);
      setActionError("Dit document kon niet worden uitgelezen.");
    } finally {
      setBusyId((current) => (current === document.id ? null : current));
    }
  };

  // Read a freshly uploaded document once, so its facts reach Hansie and the timeline.
  useEffect(() => {
    if (readOnly) return;
    const pending = (documentsQuery.data || []).find(
      (document) => document.extraction_status === "pending" && !isWrittenNote(document) && !startedRef.current.has(document.id),
    );
    if (!pending) return;
    startedRef.current.add(pending.id);
    void runExtraction(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentsQuery.data, readOnly]);

  const acceptSuggestion = async (document: TripDocumentRow) => {
    const suggestion = parseDocumentSuggestion(document.extracted_suggestion);
    if (!suggestion) return;
    setBusyId(document.id);
    setActionError("");
    try {
      await acceptDocumentSuggestion(document, suggestion);
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: ["trip-items", tripId] }),
        queryClient.invalidateQueries({ queryKey: ["trip-readiness", tripId] }),
      ]);
    } catch (error) {
      console.error("suggestion accept failed", error);
      setActionError("Het reisonderdeel kon niet worden toegevoegd.");
    } finally {
      setBusyId(null);
    }
  };

  const dismissSuggestion = async (document: TripDocumentRow) => {
    setBusyId(document.id);
    try {
      await dismissDocumentSuggestion(tripId, document.id);
      await refresh();
    } catch (error) {
      console.error("suggestion dismiss failed", error);
    } finally {
      setBusyId(null);
    }
  };

  const openDocument = async (document: TripDocumentRow) => {
    setActionError("");
    setOpeningId(document.id);
    try {
      const url = await createTripDocumentSignedUrl(document);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("document open failed", error);
      setActionError("Het document kon niet worden geopend.");
    } finally {
      setOpeningId(null);
    }
  };

  const removeDocument = async (document: TripDocumentRow) => {
    if (!window.confirm(`'${document.filename}' verwijderen?`)) return;
    setActionError("");
    try {
      await deleteTripDocument(document);
      await refresh();
    } catch (error) {
      console.error("document delete failed", error);
      setActionError("Verwijderen is niet gelukt. Probeer het opnieuw.");
    }
  };

  return (
    <section className="mt-2">
      <Button variant="secondary" className="tile-plain min-h-[68px] w-full justify-start gap-3 rounded-2xl px-3 py-2.5 text-left" onClick={() => setOptionsOpen(true)}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary"><Pencil className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Notities</span>
          <span className="block text-sm font-normal text-muted-foreground">Paklijst of iets om te onthouden</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </Button>

      {actionError && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{actionError}</p>}

      <FormSheet open={optionsOpen} onOpenChange={setOptionsOpen} title="Notities">
      {!readOnly && <div className="mt-4 space-y-2">
        <Button variant="secondary" className="tile-plain min-h-14 w-full justify-start text-base" onClick={() => { setOptionsOpen(false); setNoteKind("packing"); }}><ClipboardList />Paklijst maken</Button>
        <Button variant="secondary" className="tile-plain min-h-14 w-full justify-start text-base" onClick={() => { setOptionsOpen(false); setNoteKind("note"); }}><Pencil />Notitie schrijven</Button>
        <Button variant="secondary" className="tile-plain min-h-14 w-full justify-start text-base" onClick={() => { setOptionsOpen(false); setUploadOpen(true); }}><FilePlus2 />Bestand toevoegen</Button>
      </div>}
      {documentsQuery.isLoading ? (
        <div className="mt-3 space-y-2">
          {[0, 1].map((item) => <div key={item} className="h-12 animate-pulse rounded-sm bg-secondary" />)}
        </div>
      ) : documentsQuery.isError ? (
        <p className="mt-3 text-sm text-destructive">Je notities konden niet worden geladen.</p>
      ) : documents.length === 0 ? (
        readOnly ? <p className="mt-3 text-sm text-muted-foreground">Nog geen notities.</p> : null
      ) : (
        <div className="mt-2 border-t border-rule/10">
          {documentsQuery.data?.map((document) => {
            const canDelete = !readOnly && (isOrganizer || document.uploaded_by === currentUserId);
            const linkedItem = document.trip_item_id ? itemTitles.get(document.trip_item_id) : null;
            const createdAt = new Date(document.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
            const size = formatSize(document.size_bytes);
            const suggestion = readOnly || isWrittenNote(document) ? null : parseDocumentSuggestion(document.extracted_suggestion);
            const reading = document.extraction_status === "processing" || busyId === document.id;
            const suggestionMeta = suggestion
              ? [formatMoment(suggestion.start_at), suggestion.provider, suggestion.booking_reference]
                .filter(Boolean).join(" · ") || undefined
              : undefined;
            return (
              <div key={document.id} className="border-b border-rule/10">
              <article className="flex min-h-[56px] items-center gap-3 py-2.5">
                <IconBubble icon={FileText} tone="muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium leading-tight">{document.filename}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {getDocumentTypeLabel(document.document_type)}{linkedItem ? ` · ${linkedItem}` : ""} · {createdAt}{size ? ` · ${size}` : ""}
                  </p>
                  {reading ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.75} />Uitlezen…
                    </p>
                  ) : document.extracted_summary ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{document.extracted_summary}</p>
                  ) : document.extraction_status === "failed" && !readOnly && !isWrittenNote(document) ? (
                    <button
                      type="button"
                      onClick={() => void runExtraction(document)}
                      className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
                    >
                      <ScanLine className="h-3 w-3" strokeWidth={1.75} />Opnieuw uitlezen
                    </button>
                  ) : null}
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={openingId === document.id} onClick={() => void openDocument(document)} aria-label="Document openen">
                  <Download className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => void removeDocument(document)} aria-label="Document verwijderen">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </article>
              {suggestion && !reading && (
                <div className="pb-2.5">
                  <SuggestionRow
                    title={suggestion.title || "Reisonderdeel uit document"}
                    meta={suggestionMeta}
                    actionLabel="Toevoegen"
                    onAccept={() => void acceptSuggestion(document)}
                    onDismiss={() => void dismissSuggestion(document)}
                  />
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}
      <div className="h-6" />
      </FormSheet>

      {noteKind && <NoteCreateSheet kind={noteKind} tripId={tripId} onClose={() => setNoteKind(null)} onSaved={async () => { await refresh(); setOptionsOpen(true); }} />}

      <DocumentUploadSheet
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        tripId={tripId}
        items={items}
        onUploaded={refresh}
      />
    </section>
  );
}

function isWrittenNote(document: TripDocumentRow) {
  return document.document_type === "other" && ["Paklijst.pdf", "Notitie.pdf"].includes(document.filename);
}
