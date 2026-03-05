import { NavLink } from "react-router-dom";
import { BarChart3, Info, ClipboardList, Home, Settings, ListChecks } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function BottomNav() {
  const { isAdmin } = useAuth();
  const base = "flex flex-col items-center gap-0.5 text-[10px] py-2.5 px-3 transition-colors font-semibold uppercase tracking-wider";
  const active = "text-primary";
  const inactive = "text-muted-foreground/60";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-foreground safe-area-pb">
      <div className="flex justify-around max-w-lg mx-auto">
        <NavLink to="/uitslag" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <BarChart3 className="h-4 w-4" />
          <span>Uitslag</span>
        </NavLink>
        <NavLink to="/info" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <Info className="h-4 w-4" />
          <span>Info</span>
        </NavLink>
        <NavLink to="/accommodations" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <Home className="h-4 w-4" />
          <span>Verblijven</span>
        </NavLink>
        <NavLink to="/taken" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
          <ListChecks className="h-4 w-4" />
          <span>Taken</span>
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
            <Settings className="h-4 w-4" />
            <span>Admin</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
