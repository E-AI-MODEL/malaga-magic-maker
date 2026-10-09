import { ReactNode, useState } from "react";
import { CalendarFeedSheet } from "@/features/travel/CalendarFeedSheet";
import { CalendarPlus, Check, ChevronDown, Home, MoreHorizontal, Plus, Settings, User } from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { activeTrip, userTrips, isOrganizer } = useTrip();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isTripScreen = /^\/trip\/[^/]+(?:\/(?:reis|samen|settings))?\/?$/.test(pathname);
  const showHansie = isTripScreen && activeTrip?.status !== "archived";
  const title = pathname === "/trips" ? "Home" : pathname === "/profiel" ? "Profiel" : activeTrip?.name;

  if (isMobile) {
    return (
      <div className={`min-h-screen overflow-x-hidden bg-background ${isTripScreen ? (showHansie ? "pb-[calc(8rem+env(safe-area-inset-bottom))]" : "pb-[calc(4rem+env(safe-area-inset-bottom))]") : "pb-[env(safe-area-inset-bottom)]"}`}>
        <header className="sticky top-0 z-40 border-b border-border bg-background">
          <AdminBar />
          <div className="mx-auto grid h-12 max-w-2xl grid-cols-[40px_minmax(0,1fr)_40px] items-center px-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/trips")}
              className="h-9 w-9 text-muted-foreground"
              aria-label="Naar Home"
            >
              <Home className="h-5 w-5" strokeWidth={1.75} />
            </Button>

            {isTripScreen && activeTrip ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="mx-auto flex min-w-0 max-w-full items-center gap-1 px-2" aria-label="Wissel reis">
                    <span className="truncate font-ui text-[15px] font-semibold leading-tight">{activeTrip.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64">
                  {userTrips.slice(0, 8).map((trip) => (
                    <DropdownMenuItem key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)}>
                      <span className="truncate">{trip.name}</span>
                      {trip.id === activeTrip.id && <Check className="ml-auto h-4 w-4 text-primary" aria-hidden />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/trips")}>Alle reizen</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <h1 className="min-w-0 truncate px-2 text-center font-ui text-[15px] font-semibold leading-tight">
                {title || <span className="font-brand text-lg">Vakansie</span>}
              </h1>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" aria-label="Meer opties">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {isTripScreen && activeTrip && isOrganizer && (
                  <DropdownMenuItem onClick={() => navigate(`/trip/${activeTrip.id}/settings`)}>
                    <Settings className="mr-2 h-4 w-4" />Reisinstellingen
                  </DropdownMenuItem>
                )}
                {isTripScreen && activeTrip && activeTrip.status !== "archived" && (
                  <DropdownMenuItem onClick={() => setCalendarOpen(true)}>
                    <CalendarPlus className="mr-2 h-4 w-4" />Zet in je agenda
                  </DropdownMenuItem>
                )}
                {!isTripScreen && (
                  <DropdownMenuItem onClick={() => navigate("/profiel")}>
                    <User className="mr-2 h-4 w-4" />Profiel
                  </DropdownMenuItem>
                )}
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
        {activeTrip && <CalendarFeedSheet open={calendarOpen} onOpenChange={setCalendarOpen} tripId={activeTrip.id} />}
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
