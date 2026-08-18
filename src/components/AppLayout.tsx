import { ReactNode } from "react";
import { ArrowLeft, ChevronDown, LogOut, Plane, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AppSidebar } from "./AppSidebar";
import { NotificationCenter } from "./NotificationCenter";
import { HansieWidget } from "./HansieWidget";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { activeTrip, userTrips } = useTrip();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-background pb-20">
        <header className="sticky top-0 z-40 bg-foreground text-background">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/trips")}
                className="h-8 w-8 shrink-0 text-white/55 hover:bg-white/10 hover:text-white"
                aria-label="Terug naar mijn reizen"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {activeTrip ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex min-w-0 items-center gap-1.5 px-1 text-left transition-opacity hover:opacity-80">
                      <h1 className="truncate font-display text-xs font-extrabold uppercase tracking-[0.15em]">
                        {activeTrip.name}
                      </h1>
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuItem onClick={() => navigate("/trips")}>
                      <Plane className="mr-2 h-4 w-4" />Alle reizen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {userTrips.map((trip) => (
                      <DropdownMenuItem
                        key={trip.id}
                        onClick={() => navigate(`/trip/${trip.id}`)}
                        className={trip.id === activeTrip.id ? "bg-primary/10 font-semibold" : ""}
                      >
                        <span className="truncate">{trip.name}</span>
                        {trip.id === activeTrip.id && <span className="ml-auto text-xs text-primary">✓</span>}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/new-trip")}>
                      <Plus className="mr-2 h-4 w-4" />Nieuwe reis
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="font-display text-xs font-extrabold uppercase tracking-[0.15em]">Vakansie</span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <NotificationCenter />
              <span className="ml-1 hidden text-[11px] font-medium text-white/50 min-[390px]:inline">{profile?.display_name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void signOut()}
                className="h-7 w-7 text-white/50 hover:bg-white/10 hover:text-white"
                aria-label="Uitloggen"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl">{children}</main>
        <BottomNav />
        <HansieWidget />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="text-muted-foreground" />
              <button
                onClick={() => navigate("/trips")}
                className="truncate text-xs font-display font-extrabold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {activeTrip?.name || "Vakansie"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <span className="text-xs font-medium text-muted-foreground">{profile?.display_name}</span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1">{children}</main>
        </div>
        <HansieWidget />
      </div>
    </SidebarProvider>
  );
}
