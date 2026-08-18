import { describe, expect, it } from "vitest";
import {
  getTravelStatus,
  getTravelType,
  isoToLocalInput,
  localInputToIso,
  tripDayKey,
} from "./presentation";

describe("travel product language", () => {
  it("maps technical travel types to normal customer labels", () => {
    expect(getTravelType("rental_car").label).toBe("Huurauto");
    expect(getTravelType("stay").label).toBe("Verblijf");
  });

  it("maps technical statuses to normal customer labels", () => {
    expect(getTravelStatus("planned")).toBe("Nog te regelen");
    expect(getTravelStatus("confirmed")).toBe("Bevestigd");
  });
});

describe("trip timezone handling", () => {
  it("round-trips a summer Amsterdam wall-clock time", () => {
    const local = "2026-08-18T09:30";
    const iso = localInputToIso(local, "Europe/Amsterdam");
    expect(iso).toBe("2026-08-18T07:30:00.000Z");
    expect(isoToLocalInput(iso, "Europe/Amsterdam")).toBe(local);
  });

  it("round-trips a winter Amsterdam wall-clock time", () => {
    const local = "2026-12-18T09:30";
    const iso = localInputToIso(local, "Europe/Amsterdam");
    expect(iso).toBe("2026-12-18T08:30:00.000Z");
    expect(isoToLocalInput(iso, "Europe/Amsterdam")).toBe(local);
  });

  it("groups an instant by the trip's local day", () => {
    expect(tripDayKey("2026-08-17T22:30:00.000Z", "Europe/Amsterdam")).toBe("2026-08-18");
  });
});
