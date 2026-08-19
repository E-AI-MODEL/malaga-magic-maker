import { ReactNode } from "react";
import { Check, ChevronLeft, MoreHorizontal, Plane, Plus, Settings, User } from "lucide-react";
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
  const { profile } = useAuth();
  const { activeTrip, userTrips, isOrganizer } = useTrip();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-background pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex h-12 max-w-2xl items-center gap-1 px-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/trips")}
              className="h-9 w-9 shrink-0 text-muted-foreground"
              aria-label="Terug naar mijn reizen"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </Button>

            <h1 className="min-w-0 flex-1 truncate px-1 text-center font-ui text-[15px] font-semibold leading-tight">
              {activeTrip ? activeTrip.name : <span className="font-brand text-lg">Vakansie</span>}
            </h1>

            <div className="flex shrink-0 items-center">
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" aria-label="Meer opties">
                    <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  {activeTrip && isOrganizer && (
                    <DropdownMenuItem onClick={() => navigate(`/trip/${activeTrip.id}/settings`)}>
                      <Settings className="mr-2 h-4 w-4" />Reisinstellingen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/trips")}>
                    <Plane className="mr-2 h-4 w-4" />Mijn reizen
                  </DropdownMenuItem>
                  {activeTrip && (
                    <DropdownMenuItem onClick={() => navigate(`/trip/${activeTrip.id}`)}>
                      <span className="truncate pl-6">{activeTrip.name}</span>
                      <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2} />
                    </DropdownMenuItem>
                  )}
                  {userTrips
                    .filter((trip) => trip.id !== activeTrip?.id)
                    .slice(0, 4)
                    .map((trip) => (
                      <DropdownMenuItem key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)}>
                        <span className="truncate pl-6">{trip.name}</span>
                      </DropdownMenuItem>
                    ))}
                  <DropdownMenuItem onClick={() => navigate("/new-trip")}>
                    <Plus className="mr-2 h-4 w-4" />Nieuwe reis
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profiel")}>
                    <User className="mr-2 h-4 w-4" />Profiel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-2xl">{children}</main>
        <BottomNav />
        <HansieWidget trip={activeTrip ? { id: activeTrip.id, name: activeTrip.name } : null} floating />
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
                className="truncate font-ui text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {activeTrip?.name || <span className="font-brand text-base">Vakansie</span>}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <span className="text-xs font-medium text-muted-foreground">{profile?.display_name}</span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 pb-24">{children}</main>
        </div>
        <HansieWidget trip={activeTrip ? { id: activeTrip.id, name: activeTrip.name } : null} floating={false} />
      </div>
    </SidebarProvider>
  );
}
