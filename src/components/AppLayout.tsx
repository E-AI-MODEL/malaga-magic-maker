import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();

  return (
      <div className="min-h-screen pb-20 bg-background overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-foreground text-background">
          <div className="flex items-center justify-between px-4 py-2.5 max-w-2xl mx-auto">
            <h1 className="font-display text-xs font-extrabold uppercase tracking-[0.15em]">
              Malaga
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50 font-medium">{profile?.display_name}</span>
              <Button variant="ghost" size="icon" onClick={signOut} className="h-7 w-7 text-white/50 hover:text-white hover:bg-white/10">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto">
          {children}
        </main>
        <BottomNav />
      </div>
  );
}
