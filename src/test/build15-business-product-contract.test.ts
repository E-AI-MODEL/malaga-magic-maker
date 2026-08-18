import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Vakansie BUILD 15 business product contract", () => {
  const app = source("src/App.tsx");
  const layout = source("src/components/AppLayout.tsx");
  const hansie = source("src/components/HansieWidget.tsx");
  const trips = source("src/pages/Trips.tsx");
  const profile = source("src/pages/Profiel.tsx");
  const ops = source("src/pages/Ops.tsx");

  it("mounts Hansie once in the signed-in application shell", () => {
    expect(app).toContain("<HansieWidget />");
    expect(layout).not.toContain("HansieWidget");
    expect(hansie).toContain("availableTrips");
    expect(hansie).toContain("Reiscontext");
    expect(hansie).not.toContain("if (!activeTrip) return null");
  });

  it("keeps every Hansie request explicitly trip scoped and resets visible context", () => {
    expect(hansie).toContain("tripId: contextTrip.id");
    expect(hansie).toContain("setMessages([])");
    expect(hansie).toContain("[contextTrip?.id]");
    expect(hansie).toContain("isOpsRoute");
  });

  it("replaces the giant trip empty-state card with a compact workspace", () => {
    expect(trips).toContain("Geen actieve reis");
    expect(trips).toContain("Eerdere reizen");
    expect(trips).not.toContain("Waar wil je naartoe?");
    expect(trips).not.toContain("min-h-56");
  });

  it("presents profile as account settings", () => {
    expect(profile).toContain("Profiel, meldingen en toegang");
    expect(profile).toContain("Persoonlijk");
    expect(profile).toContain("Toegang");
    expect(profile).toContain("Platformbeheer");
  });

  it("turns ops into a health-aware platform console instead of a stat-card grid", () => {
    expect(ops).toContain('useState<Section>("overview")');
    expect(ops).toContain("Systeemgezondheid");
    expect(ops).toContain("Hansie-gebruik");
    expect(ops).toContain("Browserfouten");
    expect(ops).not.toContain("function Stat(");
  });
});
