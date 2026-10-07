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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => navigate("/profiel")} aria-label="Terug" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="border-l-4 border-primary pl-3 font-display text-[24px] font-bold uppercase">Beheer</p>
          <span className="hidden truncate text-xs text-muted-foreground sm:block">
            Interne omgeving{operator ? ` · ${operator}` : ""}
          </span>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Beheer onderdelen">
          {opsSections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={active === item.id ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors ${
                active === item.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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