const PROVIDERS: Record<string, string> = { booking: "Booking.com", airbnb: "Airbnb", micazu: "Micazu" };

export function providerLabel(value: string | null | undefined) {
  if (!value) return null;
  return PROVIDERS[value.trim().toLowerCase()] || value;
}
