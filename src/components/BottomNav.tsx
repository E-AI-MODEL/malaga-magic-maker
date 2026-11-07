import { Home, LayoutDashboard, Route, User, Users, Wallet } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTrip } from "@/contexts/TripContext";
import { askHansie } from "@/features/hansie/bus";
import { Button } from "@/components/ui/button";

export function BottomNav() {
  const { activeTrip } = useTrip();
  const { pathname, search } = useLocation();
  const isTripScreen = /^\/trip\/[^/]+(?:\/(?:reis|samen|settings))?\/?$/.test(pathname);
  const expensesActive = activeTrip && pathname === `/trip/${activeTrip.id}/samen` && new URLSearchParams(search).get("section") === "expenses";

  const base =
    "relative flex h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  const active = "bg-vakansie/10 text-vakansie";
  const inactive = "text-muted-foreground";

  const links = isTripScreen && activeTrip ? [
    { to: `/trip/${activeTrip.id}`, icon: LayoutDashboard, label: "Overzicht", end: true },
    { to: `/trip/${activeTrip.id}/reis`, icon: Route, label: "Reis", end: false },
    { to: `/trip/${activeTrip.id}/samen`, icon: Users, label: "Samen", end: false },
  ] : [{ to: "/trips", icon: Home, label: "Home", end: true }];
  const costsTo = activeTrip && isTripScreen ? `/trip/${activeTrip.id}/samen?section=expenses` : "/knaakie";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] shadow-soft">
      <div className="mx-auto flex max-w-lg gap-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
             aria-current={link.label === "Samen" && expensesActive ? false : undefined}
             className={({ isActive }) => `${base} ${isActive && !expensesActive ? active : inactive}`}
          >
            {({ isActive }) => (
              <>
                                <link.icon className="h-5 w-5" strokeWidth={isActive && !expensesActive ? 2 : 1.75} aria-hidden />
                <span>{link.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <Link to={costsTo} aria-current={expensesActive ? "page" : undefined} className={`${base} ${expensesActive ? active : inactive}`}>
          <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-knaakie text-on-image"><Wallet className="h-3.5 w-3.5" strokeWidth={2} /></span>
          <span>Knaakie</span>
        </Link>
        {isTripScreen && activeTrip && activeTrip.status !== "archived" && (
          <Button variant="ghost" type="button" onClick={() => askHansie()} className={`${base} ${inactive} px-0 py-0`} aria-label="Vraag Hansie">
            <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-hansie-deep font-display text-[13px] font-bold text-on-image">H</span>
            <span>Hansie</span>
          </Button>
        )}
        <NavLink to="/profiel" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <User className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          <span>Profiel</span>
        </NavLink>
      </div>
    </nav>
  );
}
