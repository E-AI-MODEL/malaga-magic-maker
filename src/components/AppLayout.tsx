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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/BrandLogo";

function AccountMenu({ navigate }: { navigate: (path: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" aria-label="Meer opties">
          <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={() => navigate("/trips")}>
          <Home className="mr-2 h-4 w-4" />Home
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/profiel")}>
          <User className="mr-2 h-4 w-4" />Profiel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/new-trip")}>
          <Plus className="mr-2 h-4 w-4" />Nieuwe reis
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


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

  const goHome = () => {
    if (pathname === "/trips") window.scrollTo({ top: 0 });
    else navigate("/trips");
  };

  if (isMobile) {
    if (!isTripScreen) {
      return (
        <div className="min-h-screen overflow-x-hidden bg-background pb-[env(safe-area-inset-bottom)]">
          <header className="sticky top-0 z-40 bg-background">
            <AdminBar />
            <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
              <button type="button" onClick={goHome} aria-label="Naar Home" className="flex items-center">
                <BrandLogo />
              </button>
              <AccountMenu navigate={navigate} />
            </div>
          </header>
          <main className="mx-auto max-w-2xl">{children}</main>
        </div>
      );
    }
    return (
      <div className={`min-h-screen overflow-x-hidden bg-background ${showHansie ? "pb-[calc(8.5rem+env(safe-area-inset-bottom))]" : "pb-[calc(4.75rem+env(safe-area-inset-bottom))]"}`}>
        <AdminBar />
        {/* No header bar on trip screens: two floating buttons over the photo keep the screen full. */}
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex max-w-2xl items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          <Button variant="outline" size="icon" onClick={goHome} className="pointer-events-auto h-10 w-10 rounded-full border-0 bg-card text-foreground shadow-soft" aria-label="Naar Home">
            <Home className="h-5 w-5" strokeWidth={1.75} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="pointer-events-auto h-10 w-10 rounded-full border-0 bg-card text-foreground shadow-soft" aria-label="Meer opties">
                <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {activeTrip && userTrips.length > 1 && <DropdownMenuLabel className="text-xs text-muted-foreground">Wissel reis</DropdownMenuLabel>}
              {activeTrip && userTrips.filter((trip) => trip.id !== activeTrip.id && trip.status !== "archived").slice(0, 5).map((trip) => (
                <DropdownMenuItem key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)}>
                  <ChevronDown className="mr-2 h-4 w-4 -rotate-90" /><span className="truncate">{trip.name}</span>
                </DropdownMenuItem>
              ))}
              {activeTrip && userTrips.length > 1 && <DropdownMenuSeparator />}
              {activeTrip && isOrganizer && (
                <DropdownMenuItem onClick={() => navigate(`/trip/${activeTrip.id}/settings`)}>
                  <Settings className="mr-2 h-4 w-4" />Reisinstellingen
                </DropdownMenuItem>
              )}
              {activeTrip && activeTrip.status !== "archived" && (
                <DropdownMenuItem onClick={() => setCalendarOpen(true)}>
                  <CalendarPlus className="mr-2 h-4 w-4" />Zet in je agenda
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate("/profiel")}>
                <User className="mr-2 h-4 w-4" />Profiel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/new-trip")}>
                <Plus className="mr-2 h-4 w-4" />Nieuwe reis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
                onClick={goHome}
                aria-label="Naar Home"
                className="truncate font-ui text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {isTripScreen ? "Home" : <BrandLogo className="h-7" />}
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
