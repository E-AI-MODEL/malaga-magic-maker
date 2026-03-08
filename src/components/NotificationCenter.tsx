import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

interface Notification {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
  from_user_id: string;
  task_id: string | null;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, display_name");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p: any) => { map[p.id] = p.display_name; });
      setProfiles(map);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    fetchProfiles();

    const channel = supabase
      .channel("notif-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    fetchNotifications();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative h-7 w-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 sm:w-96 px-0">
          <SheetHeader className="px-6 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-display text-lg font-extrabold">Meldingen</SheetTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                  Alles gelezen
                </Button>
              )}
            </div>
            <SheetDescription className="text-xs">
              {unreadCount > 0 ? `${unreadCount} ongelezen` : "Geen nieuwe meldingen"}
            </SheetDescription>
          </SheetHeader>

          <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Bell className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>Nog geen meldingen</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read) markRead(n.id); }}
                  className={`w-full text-left px-6 py-3.5 border-b border-border/50 transition-colors ${
                    !n.read ? "bg-primary/5" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    <div className={!n.read ? "" : "ml-5"}>
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {profiles[n.from_user_id] || "Iemand"} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: nl })}
                      </p>
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
