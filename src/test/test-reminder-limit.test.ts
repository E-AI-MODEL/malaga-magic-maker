import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { testReminderAllowed, TEST_REMINDER_LIMIT_MESSAGE } from "../../supabase/functions/_shared/test-reminder-limit";

describe("test reminder limit", () => {
  it("allows three test reminders per hour and blocks the fourth", () => {
    expect(testReminderAllowed(0)).toBe(true);
    expect(testReminderAllowed(2)).toBe(true);
    expect(testReminderAllowed(3)).toBe(false);
  });
  it("reminder-test answers 429 with the agreed message", () => {
    const src = readFileSync("supabase/functions/reminder-test/index.ts", "utf8");
    expect(src).toContain("json(429, { error: TEST_REMINDER_LIMIT_MESSAGE })");
    expect(TEST_REMINDER_LIMIT_MESSAGE).toBe("Je hebt net al een testmelding gekregen. Probeer het over een uur opnieuw.");
  });
});
