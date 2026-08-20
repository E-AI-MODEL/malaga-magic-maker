import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePlatformSwitches } from "@/features/ops/settings";

/** Subtle indicator shown only to platform admins, with the active platform switches. */
export function AdminBar() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { maintenanceMode, signupsOpen, hansieEnabled, paymentsEnabled } = usePlatformSwitches();

  if (!isAdmin) return null;

  const flags = [
    maintenanceMode ? "onderhoud" : null,
    signupsOpen ? null : "registratie dicht",
    hansieEnabled ? null : "Hansie uit",
    paymentsEnabled ? null : "betalen uit",
  ].filter(Boolean) as string[];

  return (
    <button
      type="button"
      onClick={() => navigate("/ops")}
      className="flex w-full items-center gap-2 bg-[hsl(220_14%_13%)] px-3 py-1 text-left text-[11px] font-medium text-white/70 transition-colors hover:text-white"
    >
      <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="truncate">Beheerdersmodus · limieten uitgeschakeld{flags.length > 0 ? ` · ${flags.join(" · ")}` : ""}</span>
    </button>
  );
}