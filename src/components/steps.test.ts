import { describe, expect, it } from "vitest";
import { newTripSteps } from "@/pages/NewTrip";
import { taskDueChoices } from "@/features/together/TaskWizard";
import { cleanDecisionOptions } from "@/features/together/DecisionWizard";

describe("step-by-step adding", () => {
  it("new trip: alone skips head count and inviting", () => {
    expect(newTripSteps("solo")).toEqual(["name", "where", "when", "who", "wishes", "summary"]);
    expect(newTripSteps("couple")).toEqual(["name", "where", "when", "who", "invite", "wishes", "summary"]);
    expect(newTripSteps("friends")).toEqual(["name", "where", "when", "who", "size", "invite", "wishes", "summary"]);
  });

  it("task: 'Voor vertrek' only while departure is still ahead", () => {
    const today = new Date("2026-10-31T10:00:00");
    expect(taskDueChoices(today, "2026-11-20").map((c) => c.label)).toEqual(["Vandaag", "Deze week", "Voor vertrek", "Geen datum"]);
    expect(taskDueChoices(today, "2026-11-20").find((c) => c.key === "departure")?.day).toBe("2026-11-19");
    expect(taskDueChoices(today, "2026-10-01").map((c) => c.key)).not.toContain("departure");
    expect(taskDueChoices(today, null).find((c) => c.key === "week")?.day).toBe("2026-11-01");
  });

  it("choice: empty and duplicate options do not count", () => {
    expect(cleanDecisionOptions(["Hotel", " ", "Hotel", "Camping "])).toEqual(["Hotel", "Camping"]);
  });
});
