/** Knaakie must use its URL-selected trip, never a remembered trip during loading. */
export function hansieAvailable(pathname: string, search: string, trip: { id: string; status?: string } | null) {
  if (!trip || trip.status === "archived") return false;
  if (/^\/trip\/[^/]+(?:\/(?:reis|samen|settings))?\/?$/.test(pathname)) {
    return pathname.split("/")[2] === trip.id;
  }
  return pathname === "/knaakie" && new URLSearchParams(search).get("tripId") === trip.id;
}