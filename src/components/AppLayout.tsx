import { ReactNode } from "react";
import { Check, ChevronLeft, Home, MoreHorizontal, Plus, Settings, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { AppSidebar } from "./AppSidebar";
import { AdminBar } from "./AdminBar";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { activeTrip, userTrips, isOrganizer } = useTrip();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  // The overview already shows the trip name large in its header photo.
  const isTripOverview = /^\/trip\/[^/]+\/?$/.test(pathname);
  const isTripScreen = /^\/trip\/[^/]+(?:\/(?:reis|samen|settings))?\/?$/.test(pathname);
  const showHansie = isTripScreen && activeTrip?.status !== "archived";
  const title = pathname === "/trips" ? "Home" : pathname === "/profiel" ? "Profiel" : activeTrip?.name;
  const backPath = isTripScreen && !isTripOverview && activeTrip ? `/trip/${activeTrip.id}` : "/trips";

  if (isMobile) {
    return (
      <div className={`min-h-screen overflow-x-hidden bg-background ${isTripScreen ? (showHansie ? "pb-[calc(8rem+env(safe-area-inset-bottom))]" : "pb-[calc(4rem+env(safe-area-inset-bottom))]") : "pb-[env(safe-area-inset-bottom)]"}`}>
        <header className="sticky top-0 z-40 border-b border-border bg-background">
          <AdminBar />
          <div className="mx-auto grid h-12 max-w-2xl grid-cols-[40px_minmax(0,1fr)_40px] items-center px-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backPath)}
              className="h-9 w-9 text-muted-foreground"
              aria-label={backPath === "/trips" ? "Naar Home" : "Terug naar overzicht"}
            >
              {pathname === "/trips" ? <Home className="h-5 w-5" strokeWidth={1.75} /> : <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />}
            </Button>

            <h1 className="min-w-0 truncate px-2 text-center font-ui text-[15px] font-semibold leading-tight">
              {isTripOverview ? "" : title || <span className="font-brand text-lg">Vakansie</span>}
            </h1>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" aria-label="Meer opties">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {isTripScreen && activeTrip && isOrganizer && (
                  <>
                    <DropdownMenuItem onClick={() => navigate(`/trip/${activeTrip.id}/settings`)}>
                      <Settings className="mr-2 h-4 w-4" />Reisinstellingen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {userTrips.length > 0 && (
                  <>
                    <DropdownMenuLabel className="font-ui text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Wissel reis
                    </DropdownMenuLabel>
                    {userTrips.slice(0, 6).map((trip) => (
                      <DropdownMenuItem key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)}>
                        <span className="truncate">{trip.name}</span>
                        {trip.id === activeTrip?.id && <Check className="ml-auto h-4 w-4 text-primary" aria-hidden />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem onClick={() => navigate("/trips")}>
                  <Home className="mr-2 h-4 w-4" />Home
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profiel")}>
                  <User className="mr-2 h-4 w-4" />Profiel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/new-trip")}>
                  <Plus className="mr-2 h-4 w-4" />Nieuwe reis
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-2xl">{children}</main>
        {isTripScreen && <BottomNav />}
        {showHansie && <HansieWidget trip={activeTrip} floating />}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background">
            <AdminBar />
            <div className="flex h-12 items-center justify-between px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="text-muted-foreground" />
              <Button variant="ghost"
                onClick={() => navigate("/trips")}
                className="truncate font-ui text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {title || <span className="font-brand text-base">Vakansie</span>}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <NotificationCenter />
              <span className="text-xs font-medium text-muted-foreground">{profile?.display_name}</span>
            </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 pb-8">{children}</main>
          {showHansie && <div className="sticky bottom-0 z-40 mx-auto w-full max-w-5xl"><HansieWidget trip={activeTrip} floating={false} /></div>}
        </div>
      </div>
    </SidebarProvider>
  );
}
