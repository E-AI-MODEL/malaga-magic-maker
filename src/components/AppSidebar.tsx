import { Check, ChevronDown, Home, LogOut, Plane, Plus, Route, Settings, User, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, signOut } = useAuth();
  const { activeTrip, userTrips, isOrganizer } = useTrip();
  const navigate = useNavigate();
  const location = useLocation();

  const mainLinks = activeTrip ? [
    { to: `/trip/${activeTrip.id}`, icon: Home, label: "Overzicht", end: true },
    { to: `/trip/${activeTrip.id}/reis`, icon: Route, label: "Reis", end: false },
    { to: `/trip/${activeTrip.id}/samen`, icon: Users, label: "Samen", end: false },
  ] : [];

  const isActive = (path: string, end = false) =>
    end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="pt-4">
        <div className="px-4 pb-4">
          {!collapsed && activeTrip && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-1.5 text-left transition-opacity hover:opacity-80">
                  <h1 className="truncate font-display text-xs font-extrabold uppercase tracking-[0.15em] text-sidebar-foreground">
                    {activeTrip.name}
                  </h1>
                  <ChevronDown className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />
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
                    {trip.id === activeTrip.id && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2} />}
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
          )}
          {!collapsed && !activeTrip && <span className="font-brand text-xl font-bold text-sidebar-foreground">Vakansie</span>}
        </div>

        {activeTrip && <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Deze reis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainLinks.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to, item.end)}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isOrganizer && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive(`/trip/${activeTrip.id}/settings`)}>
                    <NavLink
                      to={`/trip/${activeTrip.id}/settings`}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Reisinstellingen</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/trips"}>
                  <NavLink to="/trips" end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                    <Plane className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Mijn reizen</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/profiel"}>
                  <NavLink to="/profiel" end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                    <User className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Profiel</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="truncate text-xs font-medium text-sidebar-foreground/50">{profile?.display_name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void signOut()}
              className="h-7 w-7 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Uitloggen"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void signOut()}
            className="mx-auto h-7 w-7 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Uitloggen"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
