import { Home, Route, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTrip } from "@/contexts/TripContext";

export function BottomNav() {
  const { activeTrip } = useTrip();
  if (!activeTrip) return null;

  const base =
    "flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const active = "text-primary";
  const inactive = "text-muted-foreground";

  const links = [
    { to: `/trip/${activeTrip.id}`, icon: Home, label: "Overzicht", end: true },
    { to: `/trip/${activeTrip.id}/reis`, icon: Route, label: "Reis", end: false },
    { to: `/trip/${activeTrip.id}/samen`, icon: Users, label: "Samen", end: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-rule/10 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            <link.icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}