import { describe, expect, it } from "vitest";
import { accommodationDecisionClosedByChoice, ideaActionMessage, ideasRemovedByChoice } from "./accommodation";

const items = [
  { id: "a", type: "stay", status: "idea" },
  { id: "b", type: "stay", status: "idea" },
  { id: "c", type: "stay", status: "idea" },
  { id: "d", type: "activity", status: "idea" },
  { id: "e", type: "restaurant", status: "idea" },
  { id: "f", type: "stay", status: "confirmed" },
];

describe("Dit wordt het", () => {
  it("removes the other stay ideas", () => {
    expect(ideasRemovedByChoice(items[0], items).map((i) => i.id)).toEqual(["b", "c"]);
  });
  it("keeps activity and restaurant ideas", () => {
    const ids = ideasRemovedByChoice(items[0], items).map((i) => i.id);
    expect(ids).not.toContain("d");
    expect(ids).not.toContain("e");
    expect(ideasRemovedByChoice(items[3], items)).toEqual([]);
  });
  it("keeps the removed rows complete so undo can restore them", () => {
    const rich = [{ ...items[0] }, { ...items[1], title: "Villa", booking_url: "https://x" }];
    expect(ideasRemovedByChoice(rich[0], rich)).toEqual([rich[1]]);
  });
  it("closes the open accommodation choice for a stay only", () => {
    const decisions = [
      { id: "x", title: "Waar eten we?", status: "open" },
      { id: "y", title: "Waar verblijven we?", status: "open" },
    ];
    expect(accommodationDecisionClosedByChoice({ type: "stay" }, decisions)?.id).toBe("y");
    expect(accommodationDecisionClosedByChoice({ type: "activity" }, decisions)).toBeNull();
    expect(accommodationDecisionClosedByChoice({ type: "stay" }, [{ id: "y", title: "Waar verblijven we?", status: "closed" }])).toBeNull();
  });
});

describe("foutmeldingen bij kiezen in gewone taal", () => {
  const cases: Array<[string, string]> = [
    ["not_allowed", "Alleen de organisator kan kiezen."],
    ["undo_expired", "Ongedaan maken kan tot 10 minuten na kiezen."],
    ["not_an_idea", "Dit is al gekozen."],
    ["trip_archived", "Deze reis is gearchiveerd."],
    ["item_not_found", "Dit onderdeel bestaat niet meer."],
  ];
  it.each(cases)("vertaalt %s", (message, expected) => {
    expect(ideaActionMessage(new Error(message), "fallback")).toBe(expected);
  });
  it("houdt de bestaande tekst voor onbekende en lege fouten", () => {
    expect(ideaActionMessage(new Error("something else"), "Dit onderdeel kiezen lukte niet.")).toBe("Dit onderdeel kiezen lukte niet.");
    expect(ideaActionMessage(undefined, "Ongedaan maken lukte niet.")).toBe("Ongedaan maken lukte niet.");
  });
});
