import { describe, expect, it } from "vitest";
import { countdownLabel, firstThings } from "./overview";

const now = new Date(2026, 9, 7, 14);

describe("overview countdown", () => {
  it("counts down, names departure day and shows the trip day", () => {
    expect(countdownLabel("2026-10-16", "2026-10-20", now)).toBe("nog 9 dagen");
    expect(countdownLabel("2026-10-08", null, now)).toBe("morgen vertrek je");
    expect(countdownLabel("2026-10-07", "2026-10-10", now)).toBe("vandaag vertrek je");
    expect(countdownLabel("2026-10-05", "2026-10-11", now)).toBe("dag 3 van 7");
    expect(countdownLabel("2026-09-01", "2026-09-05", now)).toBe("afgelopen");
    expect(countdownLabel(null, null, now)).toBe("datum nog kiezen");
  });
});

describe("Eerst dit order", () => {
  const thing = (key: string) => ({ key, title: key, actionLabel: "Open", href: "/" });
  it("puts urgent first, then mine, basics, bookings, suggestions", () => {
    const list = firstThings({
      urgent: [thing("u")],
      mine: [thing("m")],
      basics: [thing("b")],
      bookings: [thing("k")],
      suggestions: [thing("s")],
    });
    expect(list.map((t) => t.key)).toEqual(["u", "m", "b", "k", "s"]);
  });
  it("falls back to a suggestion when nothing else is open", () => {
    const list = firstThings({ urgent: [], mine: [], basics: [], bookings: [], suggestions: [thing("s")] });
    expect(list[0].key).toBe("s");
  });
});

import { preparationScore } from "./overview";
describe("preparationScore", () => {
  it("does not count an empty trip as fully arranged", () => {
    const s = preparationScore({ checks: [0, 0, 0, 0, 0].map((n) => ({ attention_count: n })), itemCount: 0, missingStay: true });
    expect(s).toEqual({ done: 5, total: 7 });
  });
  it("counts a check with several open items once", () => {
    const s = preparationScore({ checks: [{ attention_count: 3 }, { attention_count: 0 }], itemCount: 2, missingStay: false });
    expect(s).toEqual({ done: 3, total: 4 });
  });
});
