import { describe, expect, it } from "vitest";
import { hansiePageFromPath } from "./bus";

describe("hansiePageFromPath", () => {
  it("follows the traveler through the trip screens", () => {
    expect(hansiePageFromPath("/trip/abc")).toBe("overzicht");
    expect(hansiePageFromPath("/trip/abc/reis")).toBe("reis");
    expect(hansiePageFromPath("/trip/abc/samen")).toBe("samen");
    expect(hansiePageFromPath("/trips")).toBe("trips");
  });
});
