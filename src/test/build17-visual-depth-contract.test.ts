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
const tripItemSheet = source("src/features/travel/TripItemSheet.tsx");
const travelTypes = source("src/features/travel/presentation.ts");

describe("Vakansie BUILD 17 visual depth contract", () => {
  it("ships shared trip photography with deterministic local fallbacks", () => {
    expect(tripVisual).toContain("hero-beach-town.jpg");
    expect(tripVisual).toContain("hero-villa.jpg");
    expect(tripVisual).toContain("hero-transport.jpg");
    expect(tripVisual).toContain("fallbackPool");
    expect(tripVisual).toContain("stableIndex");
    expect(tripVisual).toContain("coverImageUrl || fallbackPool");
    expect(tripVisual).toContain("export function TripThumb");
    expect(tripVisual).not.toContain("http");
  });

  it("keeps consumer photography and Hansie free of gradients and glass", () => {
    expect(tripVisual).not.toContain("bg-gradient");
    expect(tripVisual).not.toContain("backdrop-blur");
    expect(hansie).not.toContain("bg-gradient");
    expect(hansie).not.toContain("backdrop-blur");
    expect(trips).not.toContain("backdrop-blur");
    expect(appLayout).not.toContain("backdrop-blur");
    expect(bottomNav).not.toContain("backdrop-blur");
  });

  it("uses restrained trip photography on Mijn reizen and Overzicht", () => {
    for (const page of [trips, tripHome]) {
      expect(page).toContain("@/components/TripVisual");
      expect(page).toContain("<TripVisual");
    }
    // One photo per screen, at working size: no repeated full-bleed hero blocks.
    expect(trips).toContain("<TripThumb");
    expect(trips).toContain('height="h-[72px]"');
    expect(tripHome).toContain('height="h-[180px]"');
  });

  it("gives important objects soft depth without returning to card grids", () => {
    expect(primitives).toContain("export function Surface");
    expect(primitives).toContain("shadow-soft");
    expect(primitives).toContain("export function IconBubble");
    expect(tripHome).toContain("Voor jou");
    expect(primitives).toContain("export function DayHeader");
    expect(primitives).toContain("export function CountBar");
    expect(primitives).toContain("export function SuggestionRow");
  });

  it("keeps product iconography Lucide-only, never emoji or unicode checks", () => {
    for (const file of [appLayout, trips, tripHome, hansie, bottomNav, reis, travelTypes, tripItemSheet]) {
      expect(file).not.toMatch(/[\u2705\u2714\u2713\u{1F300}-\u{1FAFF}\u{2708}\u{26F4}]/u);
    }
    expect(appLayout).toContain("MoreHorizontal");
    expect(appLayout).toContain("Check");
    expect(reis).toContain("travelTypeIcon");
    expect(tripItemSheet).not.toContain("option.icon");
  });

  it("uses the simple mobile trip header from the chosen direction", () => {
    expect(appLayout).toContain("ChevronLeft");
    expect(appLayout).toContain('aria-label="Meer opties"');
    expect(appLayout).toContain("Wissel reis");
    expect(appLayout).not.toContain("ChevronDown");
    const mobileSection = appLayout.slice(appLayout.indexOf("if (isMobile)"), appLayout.indexOf("return (", appLayout.indexOf("if (isMobile)") + 20));
    expect(mobileSection).not.toContain("NotificationCenter");
  });

  it("keeps Hansie answers bound to the trip they were asked for", () => {
    expect(hansie).toContain("const requestTripId = trip.id");
    expect(hansie).toContain("contextIdRef.current !== requestTripId");
  });

  it("keeps the bottom nav at exactly three Lucide destinations with a stronger active state", () => {
    const labels = [...bottomNav.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
    expect(labels).toEqual(["Overzicht", "Reis", "Samen"]);
    expect(bottomNav).toContain('className="h-5 w-5"');
    expect(bottomNav).toContain("bg-card");
    expect(bottomNav).toContain("h-[3px]");
  });
});
