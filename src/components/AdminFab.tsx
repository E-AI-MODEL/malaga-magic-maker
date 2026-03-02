import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";

interface QuickStats {
  profiles: { id: string; display_name: string }[];
  lastActivity: Record<string, string>;
  intakeCompleted: number;
  totalUsers: number;
}

export function AdminFab() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<QuickStats | null>(null);

  useEffect(() => {
    if (!isAdmin || !open) return;
    (async () => {
      const [pRes, logRes, subRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name").neq("username", "admin"),
        supabase.from("activity_log").select("user_id, created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("submissions").select("user_id, locked").eq("locked", true),
      ]);
      const profiles = (pRes.data as any[]) || [];
      const logs = (logRes.data as any[]) || [];
      const subs = (subRes.data as any[]) || [];

      const lastActivity: Record<string, string> = {};
      logs.forEach((l) => {
        if (!lastActivity[l.user_id]) lastActivity[l.user_id] = l.created_at;
      });

      setStats({
        profiles,
        lastActivity,
        intakeCompleted: subs.length,
        totalUsers: profiles.length,
      });
    })();
  }, [isAdmin, open]);

  if (!isAdmin) return null;

  const isOnline = (userId: string) => {
    if (!stats?.lastActivity[userId]) return false;
    return Date.now() - new Date(stats.lastActivity[userId]).getTime() < 5 * 60 * 1000;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[5.5rem] right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
      >
        <Shield className="h-5 w-5" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[60vh]">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="font-display font-extrabold text-base">Admin overzicht</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            {/* Quick stat */}
            {stats && (
              <div className="flex gap-3">
                <div className="flex-1 bg-secondary rounded-lg p-3 text-center">
                  <p className="font-display font-extrabold text-xl">{stats.intakeCompleted}/{stats.totalUsers}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Intake compleet</p>
                </div>
                <div className="flex-1 bg-secondary rounded-lg p-3 text-center">
                  <p className="font-display font-extrabold text-xl">{stats.profiles.filter(p => isOnline(p.id)).length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nu online</p>
                </div>
              </div>
            )}

            {/* Online status */}
            {stats && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gebruikers</p>
                {stats.profiles.map((p) => {
                  const online = isOnline(p.id);
                  const lastTime = stats.lastActivity[p.id];
                  return (
                    <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                        <span className="font-medium">{p.display_name}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {lastTime
                          ? new Date(lastTime).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                          : "Geen activiteit"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <Button className="w-full gap-2" onClick={() => { setOpen(false); navigate("/admin"); }}>
              Naar dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
