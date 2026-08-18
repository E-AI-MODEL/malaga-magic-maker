import { supabase } from "@/integrations/supabase/client";
import type {
  ActivityEventRow,
  NotificationPreferencesRow,
  NotificationRow,
} from "@/integrations/supabase/database.live";

export type { ActivityEventRow, NotificationPreferencesRow, NotificationRow };

export async function listNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export async function listTripActivity(tripId: string) {
  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return data || [];
}

export async function getNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || {
    user_id: userId,
    task_assignments: true,
    decisions: true,
    trip_updates: true,
    updated_at: new Date(0).toISOString(),
  };
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: Pick<NotificationPreferencesRow, "task_assignments" | "decisions" | "trip_updates">,
) {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  if (error) throw error;
}

export function notificationDestination(notification: NotificationRow) {
  if (!notification.trip_id) return "/trips";
  if (notification.entity_type === "trip_document") return `/trip/${notification.trip_id}/reis`;
  if (["task", "decision", "trip_member"].includes(notification.entity_type || "")) {
    return `/trip/${notification.trip_id}/samen`;
  }
  return `/trip/${notification.trip_id}`;
}
