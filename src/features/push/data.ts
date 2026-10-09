import { supabase } from "@/integrations/supabase/client";
import { base64UrlToBytes, pushSupport, type PushSupport } from "./support";

export function currentPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const nav = navigator as Navigator & { standalone?: boolean };
  return pushSupport({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    standalone: window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true,
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
  });
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing || navigator.serviceWorker.register("/sw.js");
}

export async function currentDeviceSubscribed(): Promise<boolean> {
  if (currentPushSupport() !== "supported" || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

/** Called only after a tap: asks permission, subscribes this device and stores it. */
export async function enablePushOnThisDevice(userId: string): Promise<"ok" | "denied" | "unavailable"> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  const { data: key, error } = await supabase.rpc("get_push_public_key");
  if (error || !key) return "unavailable";
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) });
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "unavailable";
  const { error: saveError } = await supabase.from("push_subscriptions").upsert({
    user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth,
    user_agent: navigator.userAgent.slice(0, 300), failed_count: 0,
  }, { onConflict: "endpoint" });
  return saveError ? "unavailable" : "ok";
}

export async function disablePushOnThisDevice() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe().catch(() => false);
}

/** Shows a local notification through the service worker, so you see how it looks on this device. */
export async function showTestNotification() {
  const reg = await registration();
  await reg.showNotification("Testmelding van Vakansie", { body: "Zo ziet een herinnering eruit op dit apparaat.", icon: "/icons/app-icon-192.png", data: { url: "/trips" } });
}
