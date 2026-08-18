import { ReactNode } from "react";
import { ArrowLeft, ChevronDown, Plane, Plus, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AppSidebar } from "./AppSidebar";
import { NotificationCenter } from "./NotificationCenter";
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
  const { profile } = useAuth();
  const { activeTrip, userTrips, isOrganizer } = useTrip();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-background pb-28">
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/trips")}
                className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground"
                aria-label="Terug naar mijn reizen"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {activeTrip ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-secondary/60">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Deze reis</p>
                        <p className="truncate font-display text-sm font-extrabold leading-tight">{activeTrip.name}</p>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuItem onClick={() => navigate("/trips")}>
                      <Plane className="mr-2 h-4 w-4" />Mijn reizen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {userTrips.map((trip) => (
                      <DropdownMenuItem
                        key={trip.id}
                        onClick={() => navigate(`/trip/${trip.id}`)}
                        className={trip.id === activeTrip.id ? "bg-secondary font-semibold" : ""}
                      >
                        <span className="truncate">{trip.name}</span>
                        {trip.id === activeTrip.id && <span className="ml-auto text-xs text-primary">Actief</span>}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {isOrganizer && (
                      <DropdownMenuItem onClick={() => navigate(`/trip/${activeTrip.id}/settings`)}>
                        <Settings className="mr-2 h-4 w-4" />Reisinstellingen
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/new-trip")}>
                      <Plus className="mr-2 h-4 w-4" />Nieuwe reis
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="font-display text-sm font-extrabold">Vakansie</span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <NotificationCenter />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/profiel")}
                className="h-9 w-9 rounded-xl"
                aria-label="Profiel"
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl">{children}</main>
        <BottomNav />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 bg-background/88 px-4 backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="text-muted-foreground" />
              <button
                onClick={() => navigate("/trips")}
                className="truncate text-sm font-display font-extrabold text-foreground transition-colors hover:text-primary"
              >
                {activeTrip?.name || "Vakansie"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <button onClick={() => navigate("/profiel")} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                {profile?.display_name}
              </button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
