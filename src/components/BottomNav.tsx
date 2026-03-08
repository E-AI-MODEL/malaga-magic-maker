import { NavLink, useNavigate } from "react-router-dom";
import { BarChart3, Info, ClipboardList, MoreHorizontal, Home, Receipt, FileText, Settings, ListChecks, User, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export function BottomNav() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

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

  const moreLinks = [
    { to: "/profiel", icon: User, label: "Profiel", desc: "Je account en vakanties" },
    { to: "/wensen", icon: ListChecks, label: "Wensen", desc: "Alle wensen & voorwaarden" },
    { to: "/accommodations", icon: Home, label: "Verblijven", desc: "Bekijk alle accommodaties" },
    { to: "/kosten", icon: Receipt, label: "Kosten", desc: "Uitgaven & verrekeningen" },
    { to: "/intake", icon: FileText, label: "Intake", desc: "Jouw voorkeuren invullen" },
    ...(isAdmin ? [{ to: "/admin", icon: Settings, label: "Admin", desc: "Beheer & configuratie" }] : []),
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-foreground safe-area-pb">
        <div className="flex justify-around max-w-lg mx-auto">
          <NavLink to="/taken" className={({ isActive }) => `${base} ${isActive ? active : inactive} relative`}>
            <ClipboardList className="h-4 w-4" />
            <span>Taken</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/reisplanner" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
            <Sparkles className="h-4 w-4" />
            <span>Planner</span>
          </NavLink>
          <NavLink to="/info" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
            <Info className="h-4 w-4" />
            <span>Info</span>
          </NavLink>
          <NavLink to="/uitslag" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
            <BarChart3 className="h-4 w-4" />
            <span>Uitslag</span>
          </NavLink>
          <button className={`${base} ${moreOpen ? active : inactive}`} onClick={() => setMoreOpen(true)}>
            <MoreHorizontal className="h-4 w-4" />
            <span>Meer</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8">
          <SheetHeader className="px-6 pb-2">
            <SheetTitle className="font-display text-lg font-extrabold">Meer</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">Navigeer naar extra pagina's</SheetDescription>
          </SheetHeader>
          <div className="space-y-1 px-4">
            {moreLinks.map(link => (
              <button
                key={link.to}
                onClick={() => { setMoreOpen(false); navigate(link.to); }}
                className="flex items-center gap-4 w-full rounded-xl px-4 py-3.5 hover:bg-secondary/80 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <link.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{link.label}</p>
                  <p className="text-xs text-muted-foreground">{link.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
