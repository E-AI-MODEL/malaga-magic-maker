import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 11 legacy retirement contract", () => {
  const app = source("src/App.tsx");
  const reis = source("src/pages/TripReis.tsx");
  const profile = source("src/pages/Profiel.tsx");
  const travelData = source("src/features/travel/data.ts");
  const archiveMigration = source("supabase/migrations/20260818142000_archive_legacy_malaga_trip.sql");

  it("removes prototype pages from the production router", () => {
    for (const legacyPage of ["Info", "Uitslag", "Intake", "Accommodations", "Admin", "Taken", "Reisplanner", "TaskContext", "Kosten", "Wensen"]) {
      expect(app).not.toContain(`./pages/${legacyPage}`);
    }
    expect(app).not.toContain('path="/legacy/:tripId/taken"');
    expect(app).toContain('path="/legacy/:tripId/*"');
  });

  it("keeps generic Reis independent of legacy travel_legs", () => {
    expect(reis).not.toContain("legacyQuery");
    expect(reis).not.toContain("listLegacyTravelItems");
    expect(travelData).not.toContain('from("travel_legs")');
  });

  it("does not expose the prototype permanent invite code in Profile", () => {
    expect(profile).not.toContain("invite_code");
    expect(profile).not.toContain("Code gekopieerd");
  });

  it("archives only the exact known legacy trip without deleting data", () => {
    expect(archiveMigration).toContain("e7977afa-93ea-4a9c-a9da-de9c305e5860");
    expect(archiveMigration).toContain("status = 'archived'");
    expect(archiveMigration).not.toContain("DELETE FROM");
    expect(archiveMigration).not.toContain("DROP TABLE");
  });
});
