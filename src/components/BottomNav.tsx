import { Home, Route, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTrip } from "@/contexts/TripContext";

export function BottomNav() {
  const { activeTrip } = useTrip();
  if (!activeTrip) return null;

  const links = [
    { to: `/trip/${activeTrip.id}`, icon: Home, label: "Overzicht", end: true },
    { to: `/trip/${activeTrip.id}/reis`, icon: Route, label: "Reis", end: false },
    { to: `/trip/${activeTrip.id}/samen`, icon: Users, label: "Samen", end: false },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 safe-area-pb" aria-label="Reisnavigatie">
      <div className="mx-auto flex max-w-md gap-1 rounded-2xl border border-border/80 bg-background/95 p-1.5 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              }`
            }
          >
            <link.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
