export type MapsPlatform = "apple" | "other";

type MapsItem = {
  title?: string | null;
  location_name?: string | null;
  metadata?: unknown;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
};

function meta(item: MapsItem): Record<string, unknown> {
  const m = item.metadata;
  return m && typeof m === "object" && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Display address for an item: address, then metadata address, then location name. Shared rule with the calendar feed. */
export function itemAddress(item: MapsItem): string {
  return text(item.address) || text(meta(item).address) || text(item.location_name);
}

/** iOS, iPadOS and macOS open Apple Kaarten; everything else Google Maps. */
export function detectMapsPlatform(userAgent: string, maxTouchPoints = 0): MapsPlatform {
  if (/iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent)) return "apple";
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "apple";
  return "other";
}

/** Link to open an item in a maps app, or null when there is no usable location. */
export function mapsUrl(item: MapsItem, tripDestination: string | null | undefined, platform: MapsPlatform): string | null {
  const m = meta(item);
  const lat = num(item.latitude ?? m.latitude);
  const lon = num(item.longitude ?? m.longitude);
  const address = text(item.address) || text(m.address);
  const locationName = text(item.location_name);
  const name = text(item.title) || locationName;

  if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    const ll = `${lat},${lon}`;
    return platform === "apple"
      ? `https://maps.apple.com/?q=${encodeURIComponent(name || ll)}&ll=${encodeURIComponent(ll)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ll)}`;
  }

  let query = address;
  if (!query && locationName) {
    const destination = text(tripDestination);
    query = destination && !locationName.toLowerCase().includes(destination.toLowerCase())
      ? `${locationName}, ${destination}`
      : locationName;
  }
  if (!query) return null;

  return platform === "apple"
    ? `https://maps.apple.com/?q=${encodeURIComponent(query)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function currentMapsPlatform(): MapsPlatform {
  if (typeof navigator === "undefined") return "other";
  return detectMapsPlatform(navigator.userAgent, navigator.maxTouchPoints);
}
