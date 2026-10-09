/** Pure device checks for web push. */
export type PushSupport = "supported" | "ios_needs_home_screen" | "unsupported";

export function pushSupport(env: {
  userAgent: string; maxTouchPoints: number; standalone: boolean;
  hasServiceWorker: boolean; hasPushManager: boolean; hasNotification: boolean;
}): PushSupport {
  const ios = /iPhone|iPad|iPod/i.test(env.userAgent) || (/Macintosh/i.test(env.userAgent) && env.maxTouchPoints > 1);
  if (ios && !env.standalone) return "ios_needs_home_screen";
  if (env.hasServiceWorker && env.hasPushManager && env.hasNotification) return "supported";
  return "unsupported";
}

export function base64UrlToBytes(value: string): Uint8Array {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
