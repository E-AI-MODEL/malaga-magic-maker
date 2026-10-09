export const TEST_REMINDER_LIMIT_PER_HOUR = 3;
export const TEST_REMINDER_LIMIT_MESSAGE = "Je hebt net al een testmelding gekregen. Probeer het over een uur opnieuw.";

/** True when another test reminder may be sent, given how many were sent in the last hour. */
export function testReminderAllowed(sentLastHour: number): boolean {
  return sentLastHour < TEST_REMINDER_LIMIT_PER_HOUR;
}
