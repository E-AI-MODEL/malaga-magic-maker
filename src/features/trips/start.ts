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