import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentsSection } from "./DocumentsSection";
import type { TripDocumentRow } from "@/integrations/supabase/database.live";

const { state } = vi.hoisted(() => ({ state: { documents: [] as TripDocumentRow[] } }));

vi.mock("./data", () => ({
  listTripDocuments: vi.fn(async () => state.documents),
  createTripDocumentSignedUrl: vi.fn(async () => "https://example.test/doc"),
  deleteTripDocument: vi.fn(async () => {}),
  extractTripDocument: vi.fn(async () => {}),
  acceptDocumentSuggestion: vi.fn(async () => {}),
  dismissDocumentSuggestion: vi.fn(async () => {}),
  parseDocumentSuggestion: vi.fn(() => null),
  getDocumentTypeLabel: (value: string) => value,
}));

vi.mock("./DocumentUploadSheet", () => ({
  DocumentUploadSheet: ({ open }: { open: boolean }) => (open ? <p>Uploadpaneel open</p> : null),
}));

const document: TripDocumentRow = {
  id: "doc-1",
  trip_id: "trip-1",
  trip_item_id: null,
  uploaded_by: "u1",
  filename: "ticket.pdf",
  document_type: "ticket",
  storage_path: "trip-1/doc-1",
  mime_type: "application/pdf",
  size_bytes: 12345,
  extraction_status: "done",
  extracted_summary: null,
  extracted_suggestion: null,
  created_at: "2026-05-01T10:00:00.000Z",
} as TripDocumentRow;

function renderSection(readOnly = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DocumentsSection
        tripId="trip-1"
        items={[]}
        currentUserId="u1"
        isOrganizer
        readOnly={readOnly}
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  state.documents = [];
});

describe("empty documents", () => {
  it("opens the upload panel straight from that tile", async () => {
    renderSection();
    fireEvent.click(await screen.findByRole("button", { name: /^Notities/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Bestand toevoegen" }));
    expect(await screen.findByText("Uploadpaneel open")).toBeInTheDocument();
  });

  it("shows no add action for an archived trip", async () => {
    renderSection(true);
    fireEvent.click(await screen.findByRole("button", { name: /^Notities/ }));
    expect(await screen.findByText("Nog geen notities.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paklijst maken" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notitie schrijven" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bestand toevoegen" })).not.toBeInTheDocument();
  });
});

describe("documents present", () => {
  it("lists the file and keeps the header add action", async () => {
    state.documents = [document];
    renderSection();
    fireEvent.click(await screen.findByRole("button", { name: /^Notities/ }));
    expect(await screen.findByText("ticket.pdf")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Bestand toevoegen" })).toBeInTheDocument());
  });
});
