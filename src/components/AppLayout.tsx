import { ReactNode } from "react";
import { Home } from "lucide-react";
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
import { BrandLogo } from "@/components/BrandLogo";

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { activeTrip } = useTrip();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { pathname, search } = useLocation();
  const isTripScreen = /^\/trip\/[^/]+(?:\/(?:reis|samen|settings))?\/?$/.test(pathname);
  const showHansie = isTripScreen && activeTrip?.status !== "archived";
  const title = pathname === "/trips" ? "Home" : pathname === "/profiel" ? "Profiel" : activeTrip?.name;
  void search;
  const tripHeading = pathname.endsWith("/reis") ? "Reis"
    : pathname.endsWith("/settings") ? "Reisinstellingen"
    : null;

  const goHome = () => {
    if (pathname === "/trips") window.scrollTo({ top: 0 });
    else navigate("/trips");
  };

  if (isMobile) {
    if (!isTripScreen) {
      return (
        <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
          <header className="z-40 shrink-0 bg-background">
            <AdminBar />
            {pathname !== "/trips" && <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
              <Button variant="ghost" type="button" onClick={goHome} aria-label="Naar Home" className="flex items-center p-0">
                <BrandLogo />
              </Button>
            </div>}
          </header>
          <main className={`mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] ${pathname === "/trips" ? "overflow-hidden" : "overflow-y-auto overscroll-contain"}`}>{children}</main>
          <BottomNav />
        </div>
      );
    }
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
        <AdminBar />
        {/* Reserved row: Home and the heading only; trip and account actions live in the footer screens. */}
        <div className="z-40 mx-auto flex w-full max-w-2xl shrink-0 items-center gap-3 px-5 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Button variant="secondary" size="icon" onClick={goHome} className="h-11 w-11 rounded-2xl" aria-label="Naar Home">
            <Home className="h-5 w-5" strokeWidth={1.75} />
          </Button>
          <div className="min-w-0 flex-1">{tripHeading && <h1 className="truncate font-brand text-[28px] font-bold leading-tight">{tripHeading}</h1>}</div>
        </div>

        {/* Fixed frame: the page never scrolls; only this content box does, above the bottom nav. */}
        <main className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-[calc(4.75rem+env(safe-area-inset-bottom))]">{children}</main>
        {isTripScreen && <BottomNav />}
        {showHansie && <HansieWidget trip={activeTrip} floating showBar={false} />}
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
