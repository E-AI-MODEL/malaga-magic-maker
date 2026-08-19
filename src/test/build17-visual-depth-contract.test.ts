import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const tripVisual = source("src/components/TripVisual.tsx");
const primitives = source("src/components/primitives.tsx");
const trips = source("src/pages/Trips.tsx");
const tripHome = source("src/pages/TripHome.tsx");
const appLayout = source("src/components/AppLayout.tsx");
const hansie = source("src/components/HansieWidget.tsx");
const bottomNav = source("src/components/BottomNav.tsx");
const reis = source("src/pages/TripReis.tsx");
const travelTypes = source("src/features/travel/presentation.ts");

describe("Vakansie BUILD 17 visual depth contract", () => {
  it("ships one shared trip hero with a neutral local fallback image", () => {
    expect(tripVisual).toContain("@/assets/hero-transport.jpg");
    expect(tripVisual).toContain("coverImageUrl || heroDefault");
    expect(tripVisual).not.toContain("http");
  });

  it("uses the shared hero on Mijn reizen and Overzicht", () => {
    for (const page of [trips, tripHome]) {
      expect(page).toContain("@/components/TripVisual");
      expect(page).toContain("<TripVisual");
    }
  });

  it("gives real objects a warm surface with soft depth", () => {
    expect(primitives).toContain("export function Surface");
    expect(primitives).toContain("shadow-soft");
    expect(primitives).toContain("export function IconBubble");
    expect(trips).toContain("<Surface");
    expect(tripHome).toContain("<Surface");
  });

  it("keeps product iconography Lucide-only, never unicode or emoji", () => {
    for (const file of [appLayout, trips, tripHome, hansie, bottomNav, reis, travelTypes]) {
      expect(file).not.toMatch(/[\u2705\u2714\u2713\u{1F300}-\u{1FAFF}\u{2708}\u{26F4}]/u);
    }
    expect(appLayout).toContain("Check");
    expect(appLayout).toContain("lucide-react");
    expect(reis).toContain("travelTypeIcon");
  });

  it("keeps the Hansie ask bar as its own warm surface with a line icon", () => {
    expect(hansie).toContain("shadow-soft");
    expect(hansie).toContain("bg-card");
    expect(hansie).toContain("MessageCircle");
    expect(hansie).toMatch(/h-1[12]/);
  });

  it("keeps the bottom nav at exactly three Lucide destinations", () => {
    const labels = [...bottomNav.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
    expect(labels).toEqual(["Overzicht", "Reis", "Samen"]);
    expect(bottomNav).toContain("lucide-react");
  });
});
