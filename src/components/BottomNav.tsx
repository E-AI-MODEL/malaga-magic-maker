import { Home, Route, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTrip } from "@/contexts/TripContext";

export function BottomNav() {
  const { activeTrip } = useTrip();
  if (!activeTrip) return null;

  const base = "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors";
  const active = "text-primary";
  const inactive = "text-muted-foreground/55";

  const links = [
    { to: `/trip/${activeTrip.id}`, icon: Home, label: "Overzicht", end: true },
    { to: `/trip/${activeTrip.id}/reis`, icon: Route, label: "Reis", end: false },
    { to: `/trip/${activeTrip.id}/samen`, icon: Users, label: "Samen", end: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-foreground safe-area-pb">
      <div className="mx-auto flex max-w-lg">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            <link.icon className="h-5 w-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
