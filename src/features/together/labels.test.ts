import { describe, expect, it } from "vitest";
import { decisionStatusLine, decisionsTileLine, displayDecisionTitle, tasksTileLine } from "./labels";

describe("together labels", () => {
  it("shows the stay choice as an instruction", () => expect(displayDecisionTitle("Waar verblijven we?")).toBe("Kies jullie verblijf"));
  it("keeps other titles", () => expect(displayDecisionTitle("Welk restaurant?")).toBe("Welk restaurant?"));
  it("asks to vote when you have not voted", () => expect(decisionStatusLine("open", false)).toBe("Stem nu"));
  it("says voted after voting", () => expect(decisionStatusLine("open", true)).toBe("Gestemd"));
  it("says closed", () => expect(decisionStatusLine("closed", false)).toBe("Gesloten"));
  it("tile lines", () => {
    expect(tasksTileLine(0)).toBe("Niets voor jou");
    expect(decisionsTileLine(1)).toBe("1 wacht op je stem");
  });
});
