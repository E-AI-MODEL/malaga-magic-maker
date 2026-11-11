import { describe, expect, it } from "vitest";
import { hansieAvailable } from "./visibility";

describe("Hansie trip scope", () => {
  const trip = { id: "summer", status: "active" };
  it("is available for the selected Knaakie", () => {
    expect(hansieAvailable("/knaakie", "?tripId=summer", trip)).toBe(true);
  });
  it("does not use the previous Knaakie while switching", () => {
    expect(hansieAvailable("/knaakie", "?tripId=festival", trip)).toBe(false);
  });
  it("needs a selected trip", () => {
    expect(hansieAvailable("/knaakie", "", trip)).toBe(false);
    expect(hansieAvailable("/knaakie", "?tripId=summer", null)).toBe(false);
  });
  it("excludes archived trips and unrelated account screens", () => {
    expect(hansieAvailable("/knaakie", "?tripId=summer", { ...trip, status: "archived" })).toBe(false);
    expect(hansieAvailable("/profiel", "", trip)).toBe(false);
  });
  it("requires the matching trip on trip pages", () => {
    expect(hansieAvailable("/trip/summer/reis", "", trip)).toBe(true);
    expect(hansieAvailable("/trip/festival/reis", "", trip)).toBe(false);
  });
});