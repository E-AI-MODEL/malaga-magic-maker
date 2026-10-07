import { describe, expect, it } from "vitest";
import { mergeDetails, timelineWarnings } from "./presentation";

const base = { booking_reference: "X", status: "confirmed" };

describe("timelineWarnings", () => {
  it("flags overlapping stays", () => {
    const w = timelineWarnings([
      { ...base, id: "a", type: "stay", title: "Hotel A", start_at: "2026-05-01T14:00:00Z", end_at: "2026-05-04T10:00:00Z" },
      { ...base, id: "b", type: "stay", title: "Hotel B", start_at: "2026-05-03T14:00:00Z", end_at: "2026-05-05T10:00:00Z" },
    ], null, null);
    expect(w.map((x) => x.kind)).toEqual(["overlap"]);
  });

  it("counts nights without a stay between trip dates", () => {
    const w = timelineWarnings([
      { ...base, id: "a", type: "stay", title: "Hotel", start_at: "2026-05-01T14:00:00Z", end_at: "2026-05-03T10:00:00Z" },
    ], "2026-05-01", "2026-05-05");
    expect(w.find((x) => x.kind === "missing_stay")?.message).toBe("2 nachten nog zonder overnachting.");
  });

  it("flags booked transport without a reference but ignores cancelled and ideas", () => {
    const w = timelineWarnings([
      { id: "f", type: "flight", title: "Vlucht", status: "paid", booking_reference: null, start_at: null, end_at: null },
      { id: "g", type: "flight", title: "Vlucht 2", status: "idea", booking_reference: null, start_at: null, end_at: null },
      { id: "h", type: "flight", title: "Vlucht 3", status: "cancelled", booking_reference: null, start_at: null, end_at: null },
    ], null, null);
    expect(w).toHaveLength(1);
    expect(w[0].itemIds).toEqual(["f"]);
  });
});

describe("mergeDetails", () => {
  it("keeps only fields of the current type and preserves other metadata", () => {
    const out = mergeDetails({ source: "paste", seat: "12A" }, "stay", { address: " Via Roma 1 ", flight_number: "KL1" });
    expect(out).toEqual({ source: "paste", address: "Via Roma 1" });
  });
});
