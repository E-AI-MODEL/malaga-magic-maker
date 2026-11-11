import { describe, expect, it } from "vitest";
import { selectedStayOption } from "./accommodation";

describe("definitive accommodation selection", () => {
  it("uses the explicitly selected option, not vote totals", () => {
    expect(selectedStayOption([{ type: "stay", status: "planned", metadata: { decision_id: "choice", selected_option_id: "no-votes" } }], "choice")).toBe("no-votes");
  });
  it("never marks ideas or another decision as definitive", () => {
    expect(selectedStayOption([{ type: "stay", status: "idea", metadata: { decision_id: "choice", selected_option_id: "a" } }], "choice")).toBeNull();
    expect(selectedStayOption([{ type: "stay", status: "planned", metadata: { decision_id: "other", selected_option_id: "a" } }], "choice")).toBeNull();
  });
  it("handles old stays without decision metadata", () => {
    expect(selectedStayOption([{ type: "stay", status: "planned", metadata: {} }], "choice")).toBeNull();
  });
});