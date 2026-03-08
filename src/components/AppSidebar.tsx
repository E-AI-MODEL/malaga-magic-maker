import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import {
  Sparkles,
  ClipboardList,
  Info,
  BarChart3,
  Home,
  Receipt,
  FileText,
  Settings,
  ListChecks,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
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

const mainLinks = [
  { to: "/taken", icon: ClipboardList, label: "Taken" },
  { to: "/reisplanner", icon: Sparkles, label: "Planner" },
  { to: "/info", icon: Info, label: "Info" },
  { to: "/uitslag", icon: BarChart3, label: "Uitslag" },
];

const secondaryLinks = [
  { to: "/accommodations", icon: Home, label: "Verblijven" },
  { to: "/kosten", icon: Receipt, label: "Kosten" },
  { to: "/wensen", icon: ListChecks, label: "Wensen" },
  { to: "/intake", icon: FileText, label: "Intake" },
  { to: "/profiel", icon: User, label: "Profiel" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, signOut, isAdmin } = useAuth();
  const { activeTrip, userTrips, switchTrip } = useTrip();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const allSecondary = [
    ...secondaryLinks,
    ...(isAdmin ? [{ to: "/admin", icon: Settings, label: "Admin" }] : []),
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="pt-4">
        {/* Trip header */}
        <div className="px-4 pb-4">
          {!collapsed && (
            userTrips.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity w-full">
                    <h1 className="font-display text-xs font-extrabold uppercase tracking-[0.15em] text-sidebar-foreground truncate">
                      {activeTrip?.name || "Vakansie"}
                    </h1>
                    <ChevronDown className="h-3 w-3 text-sidebar-foreground/50 shrink-0" />
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
              <h1 className="font-display text-xs font-extrabold uppercase tracking-[0.15em] text-sidebar-foreground truncate">
                {activeTrip?.name || "Vakansie"}
              </h1>
            )
          )}
        </div>

        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Navigatie</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainLinks.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)}>
                    <NavLink to={item.to} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40">Meer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allSecondary.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)}>
                    <NavLink to={item.to} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold">
                      <item.icon className="h-4 w-4 mr-2" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with user info */}
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-sidebar-foreground/50 font-medium truncate">{profile?.display_name}</span>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={signOut} className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent mx-auto">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
