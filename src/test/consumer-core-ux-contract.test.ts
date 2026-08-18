import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 14 consumer core UX contract", () => {
  const reis = source("src/pages/TripReis.tsx");
  const samen = source("src/pages/TripSamen.tsx");
  const itemSheet = source("src/features/travel/TripItemSheet.tsx");

  it("keeps Reis quick add as a form shortcut rather than a silent write", () => {
    expect(reis).toContain('const quickAddTypes = ["flight", "train", "stay", "activity", "custom"]');
    expect(reis).toContain("onClick={() => openCreate(value)}");
    expect(reis).toContain("initialType={editingItem ? undefined : createType}");
    expect(reis).not.toContain("createTripItem(");
    expect(itemSheet).toContain("initialType?: string");
    expect(itemSheet).toContain('setType(item?.type || initialType || "custom")');
  });

  it("opens Samen on a personal overview before the detailed lists", () => {
    expect(samen).toContain('useState<Section>("overview")');
    expect(samen).toContain('assigned_user_id === user.id');
    expect(samen).toContain('vote.user_id === user.id');
    expect(samen).toContain("Voor jou");
    expect(samen).toContain("Samen regelen");
  });

  it("keeps implementation language out of the active consumer UI", () => {
    expect(reis).not.toContain("trip_items");
    expect(samen).not.toContain("UUID-verdeling");
    expect(samen).not.toContain("membership");
  });
});
