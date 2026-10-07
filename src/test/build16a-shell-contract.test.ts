import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const hansie = read("src/components/HansieWidget.tsx");
const bottomNav = read("src/components/BottomNav.tsx");
const trips = read("src/pages/Trips.tsx");
const tripHome = read("src/pages/TripHome.tsx");
const appLayout = read("src/components/AppLayout.tsx");

describe("Hansie trip scoping", () => {
  it("binds every request to one concrete trip id", () => {
    expect(hansie).toContain("const requestTripId = trip.id");
    expect(hansie).toContain("tripId: requestTripId");
  });

  it("ignores stale stream context", () => {
    expect(hansie).toContain("contextIdRef");
    expect(hansie.match(/contextIdRef\.current !== requestTripId/g)?.length).toBeGreaterThanOrEqual(2);
    expect(hansie).toContain("contextIdRef.current === requestTripId");
  });

  it("receives its placement explicitly instead of deriving a hidden context", () => {
    expect(hansie).toContain("floating = true");
    expect(trips).toContain("floating={false}");
  });

  it("resets its state when the trip changes", () => {
    expect(hansie).toMatch(/useEffect\(\(\) => \{[\s\S]*setMessages\(\[\]\)[\s\S]*\}, \[tripId\]\)/);
  });

  it("renders nothing without an authorized trip", () => {
    expect(hansie).toContain("if (!trip) return null;");
  });

  it("keeps the existing backend contract", () => {
    expect(hansie).toContain("functions/v1/trip-ai-chat");
  });

  it("receives the trip explicitly from the shell", () => {
    expect(appLayout).toContain("<HansieWidget trip=");
  });
});

describe("Bottom navigation", () => {
  it("has exactly three trip destinations", () => {
    for (const label of ["Overzicht", "Reis", "Samen"]) {
      expect(bottomNav).toContain(`label: "${label}"`);
    }
    expect(bottomNav.match(/label: "/g)).toHaveLength(3);
  });

  it("never exposes Hansie as a navigation item", () => {
    expect(bottomNav).not.toContain('label: "Hansie"');
    expect(bottomNav).not.toContain("HansieWidget");
  });
});

describe("Mijn reizen", () => {
  it("uses the existing readiness contract and shows what matters now", () => {
    expect(trips).toContain("getTripReadiness");
    expect(trips).toContain("activeReadinessChecks");
    expect(trips).toContain("readinessAction");
    expect(trips).toContain("Dit vraagt aandacht");
  });
});

describe("Trip overzicht", () => {
  it("answers what is personal, what needs attention and what comes next", () => {
    expect(tripHome).toContain("Voor jou");
    expect(tripHome).toContain("Eerst dit");
    expect(tripHome).toContain("Eerstvolgend");
  });

  it("reuses existing task and decision contracts", () => {
    expect(tripHome).toContain("listTasks");
    expect(tripHome).toContain("listDecisions");
  });
});

describe("Customer copy", () => {
  it("does not leak work names or technical entity names into the UI", () => {
    for (const source of [hansie, bottomNav, trips, tripHome, appLayout]) {
      expect(source).not.toContain("BUILD 16A");
      expect(source).not.toContain("trip_items");
    }
  });
});
