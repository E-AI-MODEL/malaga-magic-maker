import { describe, expect, it } from "vitest";
import { tripTimingLabel } from "./presentation";

describe("tripTimingLabel", () => {
  const now = new Date(2026, 7, 18, 9, 0, 0);

  it("keeps incomplete trips calm", () => {
    expect(tripTimingLabel(null, null, now)).toBe("Data nog niet gekozen");
  });

  it("uses human departure language", () => {
    expect(tripTimingLabel("2026-08-18", "2026-08-25", now)).toBe("Nu op reis");
    expect(tripTimingLabel("2026-08-19", "2026-08-25", now)).toBe("Morgen vertrek");
    expect(tripTimingLabel("2026-08-23", "2026-08-25", now)).toBe("Nog 5 dagen");
  });

  it("distinguishes completed trips", () => {
    expect(tripTimingLabel("2026-08-01", "2026-08-10", now)).toBe("Afgelopen");
  });
});
