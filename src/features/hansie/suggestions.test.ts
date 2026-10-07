import { describe, expect, it } from "vitest";
import { hansieSuggestions } from "./suggestions";

const base = { itemCount: 0, openDecisionTitle: null, expenseCount: 0, endDate: null };

describe("Hansie starter questions", () => {
  it("always offers the departure question and nothing else for an empty trip", () => {
    expect(hansieSuggestions({ ...base, now: new Date(2026, 9, 7, 14), startDate: null })).toEqual([
      "Wat moet ik nog doen voor vertrek?",
    ]);
  });

  it("names the departure weekday in the last week", () => {
    const list = hansieSuggestions({ ...base, now: new Date(2026, 9, 7, 14), startDate: "2026-10-09" });
    expect(list).toContain("Wat moet ik regelen voor vrijdag?");
  });

  it("asks about today and tomorrow while travelling", () => {
    const list = hansieSuggestions({ ...base, now: new Date(2026, 9, 7, 14), startDate: "2026-10-05", endDate: "2026-10-10" });
    expect(list).toContain("Wat staat er morgen?");
  });

  it("adds decision, expense and planning questions and caps at four", () => {
    const list = hansieSuggestions({
      now: new Date(2026, 9, 7, 14),
      startDate: "2026-10-09",
      endDate: null,
      itemCount: 3,
      openDecisionTitle: "het restaurant",
      expenseCount: 2,
    });
    expect(list).toHaveLength(4);
    expect(list).toContain("Wie moet nog stemmen over het restaurant?");
    expect(list).toContain("Wie moet wie nog betalen?");
  });

  it("never asks about departure once a trip is over or underway", () => {
    const base = { itemCount: 2, openDecisionTitle: null, expenseCount: 0 };
    const past = hansieSuggestions({ ...base, now: new Date(2026, 9, 7), startDate: "2026-06-01", endDate: "2026-06-08" });
    expect(past[0]).toBe("Wat moeten we nog afronden?");
    expect(past).not.toContain("Wat moet ik nog doen voor vertrek?");
    const during = hansieSuggestions({ ...base, now: new Date(2026, 9, 7), startDate: "2026-10-05", endDate: "2026-10-10" });
    expect(during[0]).toBe("Wat staat er vandaag op het programma?");
  });

  it("leads with settling expenses for a finished trip, without repeating the question", () => {
    const past = hansieSuggestions({
      now: new Date(2026, 9, 7),
      startDate: "2026-06-01",
      endDate: "2026-06-08",
      itemCount: 2,
      openDecisionTitle: null,
      expenseCount: 3,
    });
    expect(past[0]).toBe("Wie moet wie nog betalen?");
    expect(past).not.toContain("Wat moet ik nog doen voor vertrek?");
  });
});
