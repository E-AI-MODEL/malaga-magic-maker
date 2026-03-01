import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <h1 className="font-display text-lg font-bold tracking-tight">
            🏌️ Malaga Afvalrace
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{profile?.display_name}</span>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
