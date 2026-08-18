import { supabase } from "@/integrations/supabase/client";
import type { TripDocumentRow } from "@/integrations/supabase/database.live";

export type { TripDocumentRow };

export const documentTypes = [
  { value: "booking_confirmation", label: "Boeking" },
  { value: "ticket", label: "Ticket" },
  { value: "voucher", label: "Voucher" },
  { value: "insurance", label: "Verzekering" },
  { value: "other", label: "Overig" },
] as const;

const supportedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxFileSize = 20 * 1024 * 1024;

function parseReservation(value: unknown): { id: string; storage_path: string } {
  if (!value || typeof value !== "object") throw new Error("Invalid document reservation");
  const reservation = value as Record<string, unknown>;
  if (typeof reservation.id !== "string" || typeof reservation.storage_path !== "string") {
    throw new Error("Invalid document reservation");
  }
  return { id: reservation.id, storage_path: reservation.storage_path };
}

export function validateDocumentFile(file: File) {
  if (!supportedMimeTypes.has(file.type)) {
    throw new Error("Gebruik een PDF, JPG, PNG of WebP-bestand.");
  }
  if (file.size <= 0 || file.size > maxFileSize) {
    throw new Error("Het bestand mag maximaal 20 MB zijn.");
  }
  if (!file.name.trim() || file.name.length > 255) {
    throw new Error("De bestandsnaam is ongeldig of te lang.");
  }
}

export async function listTripDocuments(tripId: string) {
  const { data, error } = await supabase
    .from("trip_documents")
    .select("*")
    .eq("trip_id", tripId)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function uploadTripDocument(input: {
  tripId: string;
  tripItemId?: string | null;
  documentType: string;
  file: File;
}) {
  validateDocumentFile(input.file);

  const { data: reservationValue, error: reservationError } = await supabase.rpc("reserve_trip_document", {
    p_trip_id: input.tripId,
    p_trip_item_id: input.tripItemId || null,
    p_filename: input.file.name,
    p_mime_type: input.file.type,
    p_document_type: input.documentType,
  });

  if (reservationError) throw reservationError;
  const reservation = parseReservation(reservationValue);

  const cleanupMetadata = async () => {
    await supabase.from("trip_documents").delete().eq("id", reservation.id);
  };

  const { error: uploadError } = await supabase.storage
    .from("trip-documents")
    .upload(reservation.storage_path, input.file, {
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadError) {
    await cleanupMetadata();
    throw uploadError;
  }

  const { error: finalizeError } = await supabase.rpc("finalize_trip_document", {
    p_document_id: reservation.id,
    p_size_bytes: input.file.size,
  });

  if (finalizeError) {
    await supabase.storage.from("trip-documents").remove([reservation.storage_path]);
    await cleanupMetadata();
    throw finalizeError;
  }

  return reservation.id;
}

export async function createTripDocumentSignedUrl(document: TripDocumentRow) {
  const { data, error } = await supabase.storage
    .from("trip-documents")
    .createSignedUrl(document.storage_path, 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteTripDocument(document: TripDocumentRow) {
  const { error: storageError } = await supabase.storage
    .from("trip-documents")
    .remove([document.storage_path]);

  if (storageError) throw storageError;

  const { error: metadataError } = await supabase
    .from("trip_documents")
    .delete()
    .eq("id", document.id)
    .eq("trip_id", document.trip_id);

  if (metadataError) throw metadataError;
}

export function getDocumentTypeLabel(value: string) {
  return documentTypes.find((item) => item.value === value)?.label || "Document";
}
