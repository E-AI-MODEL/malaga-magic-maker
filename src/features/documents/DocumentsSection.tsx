import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TripItemRow } from "@/integrations/supabase/database";
import {
  createTripDocumentSignedUrl,
  deleteTripDocument,
  getDocumentTypeLabel,
  listTripDocuments,
  type TripDocumentRow,
} from "./data";
import { DocumentUploadSheet } from "./DocumentUploadSheet";
import { EmptyLine, IconBubble } from "@/components/primitives";

function formatSize(value: number | null) {
  if (!value) return null;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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
  const [actionError, setActionError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ["trip-documents", tripId],
    queryFn: () => listTripDocuments(tripId),
    enabled: Boolean(tripId),
  });

  const itemTitles = new Map(items.map((item) => [item.id, item.title]));

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["trip-documents", tripId] });
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
    <section className="mt-8 border-t border-rule/10 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-ui text-[15px] font-semibold">Documenten</h2>
        {!readOnly && (
          <Button variant="ghost" size="sm" onClick={() => setUploadOpen(true)} className="-mr-2 h-8 rounded-full px-2 text-muted-foreground">
            <Plus className="mr-1 h-3.5 w-3.5" />Toevoegen
          </Button>
        )}
      </div>

      {actionError && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{actionError}</p>}

      {documentsQuery.isLoading ? (
        <div className="mt-3 space-y-2">
          {[0, 1].map((item) => <div key={item} className="h-12 animate-pulse rounded-sm bg-secondary" />)}
        </div>
      ) : documentsQuery.isError ? (
        <p className="mt-3 text-sm text-destructive">Je documenten konden niet worden geladen.</p>
      ) : (documentsQuery.data?.length || 0) === 0 ? (
        <EmptyLine
          text="Nog geen tickets, vouchers of bevestigingen."
          actionLabel={readOnly ? undefined : "Document toevoegen"}
          onClick={readOnly ? undefined : () => setUploadOpen(true)}
        />
      ) : (
        <div className="mt-2 border-t border-rule/10">
          {documentsQuery.data?.map((document) => {
            const canDelete = !readOnly && (isOrganizer || document.uploaded_by === currentUserId);
            const linkedItem = document.trip_item_id ? itemTitles.get(document.trip_item_id) : null;
            const createdAt = new Date(document.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
            const size = formatSize(document.size_bytes);
            return (
              <article key={document.id} className="flex min-h-[56px] items-center gap-3 border-b border-rule/10 py-2.5">
                <IconBubble icon={FileText} tone="muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium leading-tight">{document.filename}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {getDocumentTypeLabel(document.document_type)}{linkedItem ? ` · ${linkedItem}` : ""} · {createdAt}{size ? ` · ${size}` : ""}
                  </p>
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
            );
          })}
        </div>
      )}

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
