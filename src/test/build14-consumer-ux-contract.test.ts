import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 14 consumer UX contract", () => {
  const reis = source("src/pages/TripReis.tsx");
  const itemSheet = source("src/features/travel/TripItemSheet.tsx");
  const samen = source("src/pages/TripSamen.tsx");

  it("uses quick add only to preselect the existing travel form", () => {
    expect(reis).toContain('openCreate(value)');
    expect(reis).toContain('initialType={editingItem ? undefined : createType}');
    expect(itemSheet).toContain('initialType?: string');
    expect(itemSheet).toContain('setType(item?.type || initialType || "custom")');
    expect(reis).not.toContain('createTripItem(');
  });

  it("opens Samen on the consumer overview and surfaces personal attention", () => {
    expect(samen).toContain('useState<Section>("overview")');
    expect(samen).toContain('Voor jou');
    expect(samen).toContain('myTasks');
    expect(samen).toContain('myPendingDecisions');
    expect(samen).toContain('Samen regelen');
  });

  it("keeps implementation language out of the active consumer UI", () => {
    expect(reis).not.toContain('trip_items');
    expect(samen).not.toContain('UUID-verdeling');
    expect(samen).not.toContain('memberships');
  });
});
