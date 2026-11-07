import { LayoutDashboard, Route, Users, Wallet } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTrip } from "@/contexts/TripContext";
import { Button } from "@/components/ui/button";

export function BottomNav() {
  const { activeTrip } = useTrip();
  const { pathname, search } = useLocation();
  if (!activeTrip) return null;
  const expensesActive = pathname === `/trip/${activeTrip.id}/samen` && new URLSearchParams(search).get("section") === "expenses";

  const base =
    "relative flex h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring";
  const active = "bg-vakansie/10 text-vakansie";
  const inactive = "text-muted-foreground";

  const links = [
    { to: `/trip/${activeTrip.id}`, icon: LayoutDashboard, label: "Overzicht", end: true },
    { to: `/trip/${activeTrip.id}/reis`, icon: Route, label: "Reis", end: false },
    { to: `/trip/${activeTrip.id}/samen`, icon: Users, label: "Samen", end: false },
  ];

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
         <Button asChild variant="ghost" className={`${base} tile-knaakie h-[56px] rounded-2xl px-0 py-0 text-[11px] text-on-image hover:text-on-image ${expensesActive ? "ring-2 ring-foreground/20" : ""}`}>
           <Link to={`/trip/${activeTrip.id}/samen?section=expenses`} aria-current={expensesActive ? "page" : undefined}>
                          <Wallet className="!h-5 !w-5" strokeWidth={expensesActive ? 2 : 1.75} aria-hidden />
             <span>Knaakie</span>
           </Link>
         </Button>
      </div>
    </nav>
  );
}
