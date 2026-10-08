/** Parse a comma-separated origin list (e.g. the ALLOWED_APP_ORIGINS secret). */
export function parseAllowedOrigins(raw: string | undefined | null): Set<string> {
  const out = new Set<string>();
  for (const part of (raw ?? "").split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      out.add(new URL(trimmed).origin);
    } catch {
      // ignore malformed entries
    }
  }
  return out;
}

/** True only when the URL's origin exactly matches one of the allowed origins. */
export function isAllowedReturnUrl(value: unknown, allowed: Set<string>): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    return allowed.has(new URL(value).origin);
  } catch {
    return false;
  }
}

/**
 * Public https URL with a normal hostname. Rejects IP addresses, localhost,
 * *.local, *.internal, dotless hosts, credentials and ports other than 443.
 */
export function isSafePublicHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port !== "" && url.port !== "443") return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || !host.includes(".")) return false;
  if (host.startsWith("[") || host.includes(":")) return false; // IPv6
  if (/^[0-9.]+$/.test(host)) return false; // IPv4 (incl. short forms)
  if (/^0x/i.test(host.split(".")[0])) return false; // hex IPv4 forms
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (!/^[a-z0-9.-]+$/.test(host)) return false;
  if (host.split(".").some((label) => !label || label.startsWith("-") || label.endsWith("-"))) return false;
  return true;
}
