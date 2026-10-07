import { Home, Route, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTrip } from "@/contexts/TripContext";

export function BottomNav() {
  const { activeTrip } = useTrip();
  if (!activeTrip) return null;

  const base =
    "relative flex h-[58px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  const active = "text-foreground";
  const inactive = "text-muted-foreground";

  const links = [
    { to: `/trip/${activeTrip.id}`, icon: Home, label: "Overzicht", end: true },
    { to: `/trip/${activeTrip.id}/reis`, icon: Route, label: "Reis", end: false },
    { to: `/trip/${activeTrip.id}/samen`, icon: Users, label: "Samen", end: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden className="absolute inset-x-7 top-0 h-[3px] bg-primary" />}
                <link.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.75} aria-hidden />
                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
