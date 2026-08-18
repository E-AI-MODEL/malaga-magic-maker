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
    <section className="mt-10 border-t border-border pt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Documenten</p>
          <h2 className="mt-2 font-display text-xl font-extrabold">Je reispapieren bij elkaar</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Bewaar tickets, vouchers en bevestigingen privé bij deze reis. Een document wordt pas zichtbaar nadat de upload volledig is afgerond.
          </p>
        </div>
        {!readOnly && (
          <Button variant="outline" onClick={() => setUploadOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /><span className="hidden sm:inline">Document</span><span className="sm:hidden">Nieuw</span>
          </Button>
        )}
      </div>

      {actionError && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{actionError}</p>}

      {documentsQuery.isLoading ? (
        <div className="mt-5 space-y-2">
          {[0, 1].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl border border-border bg-card" />)}
        </div>
      ) : documentsQuery.isError ? (
        <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">Je documenten konden niet worden geladen.</div>
      ) : (documentsQuery.data?.length || 0) === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/40 px-5 py-7 text-center">
          <FileText className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Nog geen documenten</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Voeg alleen reispapieren toe die je onderweg of bij vertrek nodig kunt hebben.</p>
          {!readOnly && <Button size="sm" onClick={() => setUploadOpen(true)} className="mt-4"><Plus className="mr-1.5 h-3.5 w-3.5" />Eerste document</Button>}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {documentsQuery.data?.map((document) => {
            const canDelete = !readOnly && (isOrganizer || document.uploaded_by === currentUserId);
            const linkedItem = document.trip_item_id ? itemTitles.get(document.trip_item_id) : null;
            const createdAt = new Date(document.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
            const size = formatSize(document.size_bytes);
            return (
              <article key={document.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{document.filename}</p>
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
