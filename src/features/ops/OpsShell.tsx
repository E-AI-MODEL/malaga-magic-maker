import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export type OpsSection = "overview" | "users" | "trips" | "settings" | "audit" | "errors";

export const opsSections: Array<{ id: OpsSection; label: string }> = [
  { id: "overview", label: "Overzicht" },
  { id: "users", label: "Gebruikers" },
  { id: "trips", label: "Reizen" },
  { id: "settings", label: "Instellingen" },
  { id: "audit", label: "Logboek" },
  { id: "errors", label: "Fouten" },
];

export function opsSectionPath(section: OpsSection) {
  return section === "errors" ? "/ops/errors" : `/ops?section=${section}`;
}

export function OpsShell({
  active,
  onSelect,
  operator,
  children,
}: {
  active: OpsSection;
  onSelect: (section: OpsSection) => void;
  operator?: string | null;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="ops-scope min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-[hsl(220_14%_13%)] text-white/90">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <button onClick={() => navigate("/profiel")} aria-label="Terug" className="text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold tracking-tight">Beheer</p>
          <span className="hidden truncate text-xs text-white/40 sm:block">
            Interne omgeving{operator ? ` · ${operator}` : ""}
          </span>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-1 sm:px-6" aria-label="Beheer onderdelen">
          {opsSections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active === item.id ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
                active === item.id ? "border-white text-white" : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}