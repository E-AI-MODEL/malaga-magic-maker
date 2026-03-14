import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { AppSidebar } from "./AppSidebar";
import { NotificationCenter } from "./NotificationCenter";
import { AiChatWidget } from "./AiChatWidget";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown } from "lucide-react";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { activeTrip, userTrips, switchTrip } = useTrip();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Mobile layout: header + bottom nav
  if (isMobile) {
    return (
      <div className="min-h-screen pb-20 bg-background overflow-x-hidden">
        <header className="sticky top-0 z-40 bg-foreground text-background">
          <div className="flex items-center justify-between px-4 py-2.5 max-w-2xl mx-auto">
            {userTrips.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                    <h1 className="font-display text-xs font-extrabold uppercase tracking-[0.15em]">
                      {activeTrip?.name || "Vakansie"}
                    </h1>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {userTrips.map((trip) => (
                    <DropdownMenuItem
                      key={trip.id}
                      onClick={() => switchTrip(trip.id)}
                      className={trip.id === activeTrip?.id ? "bg-primary/10 font-semibold" : ""}
                    >
                      <span className="truncate">{trip.name}</span>
                      {trip.id === activeTrip?.id && <span className="ml-auto text-primary text-xs">✓</span>}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/onboarding")}>+ Nieuwe vakantie</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <h1 className="font-display text-xs font-extrabold uppercase tracking-[0.15em]">
                {activeTrip?.name || "Vakansie"}
              </h1>
            )}
            <div className="flex items-center gap-1">
              <NotificationCenter />
              <span className="text-[11px] text-white/50 font-medium ml-1">{profile?.display_name}</span>
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
        <AiChatWidget />
      </div>
    );
  }

  // Desktop layout: sidebar + main content
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-40 h-12 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground" />
              <span className="text-xs font-display font-extrabold uppercase tracking-[0.15em] text-muted-foreground">
                {activeTrip?.name || "Vakansie"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <span className="text-xs text-muted-foreground font-medium">{profile?.display_name}</span>
            </div>
          </header>
          <main className="flex-1 max-w-4xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
