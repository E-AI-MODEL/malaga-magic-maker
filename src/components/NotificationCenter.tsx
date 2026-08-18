import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationDestination,
} from "@/features/notifications/data";

export function NotificationCenter() {
  const { user } = useAuth();
  const { userTrips } = useTrip();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => listNotifications(user?.id || ""),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const tripNames = new Map(userTrips.map((trip) => [trip.id, trip.name]));

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      await markAllNotificationsRead(user.id);
      await queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    } catch (error) {
      console.error("mark notifications read failed", error);
    }
  };

  const openNotification = async (notification: (typeof notifications)[number]) => {
    try {
      if (!notification.read) await markNotificationRead(notification.id);
    } catch (error) {
      console.error("mark notification read failed", error);
    }
    setOpen(false);
    if (user) void queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
    navigate(notificationDestination(notification));
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`relative flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          isMobile
            ? "text-white/55 hover:bg-white/10 hover:text-white"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
        aria-label={unreadCount > 0 ? `${unreadCount} ongelezen meldingen` : "Meldingen"}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[88vw] max-w-sm px-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-5 pb-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="font-display text-lg font-extrabold">Meldingen</SheetTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void markAllRead()}>
                  Alles gelezen
                </Button>
              )}
            </div>
            <SheetDescription className="text-xs">
              {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? "nieuwe melding" : "nieuwe meldingen"}` : "Je bent bij."}
            </SheetDescription>
          </SheetHeader>

          <div className="max-h-[calc(100vh-110px)] overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <div className="space-y-2 p-5">
                {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-secondary" />)}
              </div>
            ) : notificationsQuery.isError ? (
              <p className="p-5 text-sm text-destructive">Meldingen konden niet worden geladen.</p>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-14 text-center text-muted-foreground">
                <Bell className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">Nog geen meldingen</p>
                <p className="mt-1 text-xs">Belangrijke veranderingen rond je reizen verschijnen hier.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => void openNotification(notification)}
                  className={`w-full border-b border-border/60 px-5 py-4 text-left transition-colors ${
                    notification.read ? "hover:bg-secondary/45" : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{notification.message}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                        {notification.trip_id && tripNames.get(notification.trip_id) && <span>{tripNames.get(notification.trip_id)}</span>}
                        <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: nl })}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
