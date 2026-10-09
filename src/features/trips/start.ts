type StartTrip = { id: string; status: string };

/** Used only at entry; explicit trip URLs and /trips never consult the remembered trip. */
export function signedInStartPath(trips: StartTrip[], recentTripId: string | null): string {
  const active = trips.filter((trip) => trip.status !== "archived");
  if (active.length === 1) return `/trip/${active[0].id}`;
  if (active.length > 1 && active.some((trip) => trip.id === recentTripId)) return `/trip/${recentTripId}`;
  return "/trips";
}

/** Pending invite stored when a logged-out visitor opens /join/:code; consumed once at signed-in entry. */
export function pendingInvitePath(read: () => string | null): string | null {
  const code = read();
  if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  return `/join/${code}`;
}

export function loginDestination(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}