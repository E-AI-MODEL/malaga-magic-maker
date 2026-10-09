import { describe, expect, it } from "vitest";
import {
  buildGettingStartedSteps,
  gettingStartedDone,
  hasUsableInvite,
  type GettingStartedInput,
} from "./data";

const organizerInput: GettingStartedInput = {
  hasTrip: false,
  tripId: "trip-1",
  isOrganizer: true,
  memberCount: 1,
  hasOpenInvite: false,
  hasBookedItem: false,
  hasDocument: false,
  hasAskedHansie: false,
};

describe("Getting-started checklist", () => {
  it("shows five steps for an organizer, in the planned order", () => {
    const steps = buildGettingStartedSteps(organizerInput);
    expect(steps.map((step) => step.key)).toEqual(["trip", "invite", "item", "document", "hansie"]);
  });

  it("ticks off trip creation, extra members and an open invite", () => {
    expect(buildGettingStartedSteps(organizerInput).find((s) => s.key === "trip")!.done).toBe(false);
    expect(
      buildGettingStartedSteps({ ...organizerInput, hasTrip: true }).find((s) => s.key === "trip")!.done,
    ).toBe(true);

    const invite = buildGettingStartedSteps({ ...organizerInput, hasTrip: true }).find(
      (s) => s.key === "invite",
    )!;
    expect(invite.done).toBe(false);
    expect(
      buildGettingStartedSteps({ ...organizerInput, hasTrip: true, memberCount: 2 }).find(
        (s) => s.key === "invite",
      )!.done,
    ).toBe(true);
    expect(
      buildGettingStartedSteps({ ...organizerInput, hasTrip: true, hasOpenInvite: true }).find(
        (s) => s.key === "invite",
      )!.done,
    ).toBe(true);
  });

  it("links every open step into the next trip", () => {
    const steps = buildGettingStartedSteps({ ...organizerInput, hasTrip: true });
    expect(steps.find((s) => s.key === "invite")!.href).toBe("/trip/trip-1/settings");
    expect(steps.find((s) => s.key === "item")!.href).toBe("/trip/trip-1/reis");
    expect(steps.find((s) => s.key === "hansie")!.href).toBe("/trip/trip-1");
  });

  it("shows invited companions only the three group steps", () => {
    const steps = buildGettingStartedSteps({ ...organizerInput, isOrganizer: false });
    expect(steps.map((step) => step.key)).toEqual(["item", "document", "hansie"]);
    expect(steps.every((step) => step.done)).toBe(false);
  });

  it("only counts a booked item, not an idea", () => {
    const input = { ...organizerInput, hasTrip: true };
    expect(buildGettingStartedSteps(input).find((s) => s.key === "item")!.done).toBe(false);
    expect(
      buildGettingStartedSteps({ ...input, hasBookedItem: true }).find((s) => s.key === "item")!.done,
    ).toBe(true);
  });

  it("disappears once every step is done", () => {
    const allDone = buildGettingStartedSteps({
      hasTrip: true,
      tripId: "trip-1",
      isOrganizer: true,
      memberCount: 2,
      hasOpenInvite: false,
      hasBookedItem: true,
      hasDocument: true,
      hasAskedHansie: true,
    });
    expect(gettingStartedDone(allDone)).toBe(true);

    const oneOpen = buildGettingStartedSteps({ ...allDoneInput(), hasAskedHansie: false });
    expect(gettingStartedDone(oneOpen)).toBe(false);
  });

  it("treats a live invite as usable and a revoked, expired or used-up one as not", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const live = { revoked_at: null, expires_at: "2026-02-01T00:00:00Z", use_count: 0, max_uses: 5 };
    expect(hasUsableInvite([live], now)).toBe(true);
    expect(hasUsableInvite([{ ...live, revoked_at: "2026-01-01T00:00:00Z" }], now)).toBe(false);
    expect(hasUsableInvite([{ ...live, expires_at: "2026-01-01T00:00:00Z" }], now)).toBe(false);
    expect(hasUsableInvite([{ ...live, use_count: 5 }], now)).toBe(false);
    expect(hasUsableInvite([{ ...live, expires_at: null }], now)).toBe(true);
  });
});

function allDoneInput(): GettingStartedInput {
  return {
    hasTrip: true,
    tripId: "trip-1",
    isOrganizer: true,
    memberCount: 2,
    hasOpenInvite: false,
    hasBookedItem: true,
    hasDocument: true,
    hasAskedHansie: true,
  };
}
