import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie production UI contract", () => {
  const nav = source("src/components/BottomNav.tsx");
  const hansie = source("src/components/HansieWidget.tsx");
  const reis = source("src/pages/TripReis.tsx");
  const samen = source("src/pages/TripSamen.tsx");
  const profiel = source("src/pages/Profiel.tsx");
  const ops = source("src/pages/Ops.tsx");
  const opsErrors = source("src/pages/OpsErrors.tsx");
  const opsShell = source("src/features/ops/OpsShell.tsx");

  it("keeps exactly three trip navigation destinations", () => {
    const items = nav.match(/label: "/g) || [];
    expect(items).toHaveLength(3);
    expect(nav).toContain('label: "Overzicht"');
    expect(nav).toContain('label: "Reis"');
    expect(nav).toContain('label: "Samen"');
  });

  it("preserves the Hansie concrete tripId and stale-context contract", () => {
    expect(hansie).toContain("const requestTripId = trip.id");
    expect(hansie).toContain("tripId: requestTripId");
    expect(hansie).toContain("contextIdRef.current !== requestTripId");
  });

  it("keeps the Reis quick-add contract on the existing item sheet", () => {
    expect(reis).toContain("openCreate(value)");
    expect(reis).toContain("initialType={editingItem ? undefined : createType}");
    expect(reis).toContain("Nog niet ingepland");
    expect(reis).toContain("DocumentsSection");
    expect(reis).not.toContain("createTripItem(");
  });

  it("limits the Samen primary switcher to Taken, Keuzes and Kosten", () => {
    expect(samen).toContain('type Section = "tasks" | "decisions" | "expenses"');
    expect(samen).toContain('{ id: "tasks", label: "Taken" }');
    expect(samen).toContain('{ id: "decisions", label: "Keuzes" }');
    expect(samen).toContain('{ id: "expenses", label: "Kosten" }');
    expect(samen).not.toContain('label: "Mensen"');
    expect(samen).toContain("Voor jou");
    expect(samen).toContain("Reizigers");
    expect(samen).toContain("myTasks");
    expect(samen).toContain("myPendingDecisions");
  });

  it("keeps the profile settings surface functional", () => {
    expect(profiel).toContain("NotificationPreferences");
    expect(profiel).toContain("display_name");
    expect(profiel).toContain("signOut");
  });

  it("exposes all five admin destinations including Fouten", () => {
    for (const label of ["Overzicht", "Gebruikers", "Reizen", "Logboek", "Fouten"]) {
      expect(opsShell).toContain(`label: "${label}"`);
    }
    expect(opsErrors).toContain('active="errors"');
    expect(ops).toContain("getOpsSummary");
    expect(opsErrors).toContain("listRecentClientErrors");
  });

  it("deep-links admin sections through /ops?section=<id>", () => {
    expect(opsShell).toContain('section === "errors" ? "/ops/errors" : `/ops?section=${section}`');
    expect(ops).toContain("useSearchParams");
    expect(ops).toContain('parseSection(searchParams.get("section"))');
    expect(ops).toContain('opsSectionPath("errors")');
    expect(ops).toContain("setSearchParams({ section: next }");
    expect(opsErrors).toContain("navigate(opsSectionPath(section))");
  });

  it("uses line icons instead of emoji for itinerary rows", () => {
    expect(reis).toContain("travelTypeIcon");
    expect(reis).toContain("<TypeIcon");
    expect(reis).not.toContain("{type.icon}");
    expect(reis).toContain("getTravelType(item.type)");
    expect(reis).toContain("{type.label}");
  });

  it("keeps internal and legacy language out of the signed-in surfaces", () => {
    for (const file of [reis, samen, profiel, ops, opsErrors, opsShell, nav]) {
      expect(file).not.toContain("BUILD 16B");
      expect(file).not.toContain("Malaga");
      expect(file).not.toContain("golf");
    }
    for (const file of [reis, samen, profiel, nav]) {
      expect(file).not.toContain("trip_items");
    }
  });
});
