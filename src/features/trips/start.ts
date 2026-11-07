/** Pending invite stored when a logged-out visitor opens /join/:code; consumed once at signed-in entry. */
export function signedInEntryPath(invite: string | null): string {
  return invite || "/trips";
}

export function pendingInvitePath(read: () => string | null): string | null {
  const code = read();
  if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  return `/join/${code}`;
}

export function loginDestination(next: string | null): string {
  return oauthReturnPath(next);
}

/** Keep Knaakie on its own screen; the selected authorized trip is scoped by URL. */
export function knaakieDestination(trips: { id: string; status: string; start_date: string | null }[]): string {
  const trip = trips.filter((item) => item.status !== "archived").sort((a, b) =>
    (a.start_date || "9999").localeCompare(b.start_date || "9999"),
  )[0];
  return trip ? `/knaakie?tripId=${encodeURIComponent(trip.id)}` : "/knaakie";
}