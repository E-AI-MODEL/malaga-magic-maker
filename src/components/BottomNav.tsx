import { NavLink } from "react-router-dom";
import { BarChart3, Info, Home, Settings, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function BottomNav() {
  const { isAdmin, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .then(({ count }) => setUnreadCount(count || 0));
    };
    fetchUnread();
    const channel = supabase
      .channel("bottomnav-notif")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchUnread)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const base = "flex flex-col items-center gap-0.5 text-[10px] py-2.5 px-3 transition-colors font-semibold uppercase tracking-wider";
  const active = "text-primary";
  const inactive = "text-muted-foreground/60";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-foreground safe-area-pb">
      <div className="flex justify-around max-w-lg mx-auto">
        <NavLink to="/taken" className={({ isActive }) => `${base} ${isActive ? active : inactive} relative`}>
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </NavLink>
        <NavLink to="/info" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <Info className="h-4 w-4" />
          <span>Info</span>
        </NavLink>
        <NavLink to="/accommodations" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <Home className="h-4 w-4" />
          <span>Verblijven</span>
        </NavLink>
        <NavLink to="/uitslag" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <BarChart3 className="h-4 w-4" />
          <span>Uitslag</span>
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
            <Settings className="h-4 w-4" />
            <span>Admin</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
