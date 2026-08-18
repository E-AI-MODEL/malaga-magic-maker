import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { getOpsSummary } from "@/features/ops/data";
import { listRecentClientErrors } from "@/features/ops/errors";
import { OpsShell, opsSectionPath, type OpsSection } from "@/features/ops/OpsShell";

function formatDate(value: string) {
  return new Date(value).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OpsErrors() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const summary = useQuery({ queryKey: ["ops-summary"], queryFn: getOpsSummary });
  const errors = useQuery({ queryKey: ["ops-client-errors"], queryFn: listRecentClientErrors });

  const select = (section: OpsSection) => {
    if (section === "errors") return;
    navigate(opsSectionPath(section));
  };

  return (
    <OpsShell active="errors" onSelect={select} operator={profile?.display_name}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule/10 pb-4 text-sm">
        <span className="flex items-baseline gap-2">
          <span className="text-base font-semibold tabular">{summary.data?.hansie_requests_24h ?? "…"}</span>
          <span className="text-xs text-muted-foreground">Hansie · 24 uur</span>
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-base font-semibold tabular">{summary.data?.client_errors_24h ?? "…"}</span>
          <span className="text-xs text-muted-foreground">Browserfouten · 24 uur</span>
        </span>
      </div>

      <section className="mt-5">
        <p className="text-[13px] font-semibold text-foreground/70">Recente browserfouten</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Alleen opgeschoonde foutmeldingen en beperkte technische context. Geen wachtwoorden, documenten of gesprekken.
        </p>

        {errors.isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((item) => <div key={item} className="h-10 animate-pulse rounded-md bg-secondary/70" />)}
          </div>
        ) : errors.isError ? (
          <p className="mt-4 text-sm text-destructive">De foutmeldingen konden niet worden geladen.</p>
        ) : (errors.data?.length || 0) === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Geen recente browserfouten.</p>
        ) : (
          <div className="mt-3 rule-divide">
            {errors.data?.map((event) => (
              <div key={event.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium">{event.area}</p>
                  <span className="shrink-0 text-[11px] tabular text-muted-foreground">{formatDate(event.created_at)}</span>
                </div>
                <p className="mt-0.5 break-words text-xs text-muted-foreground">{event.message}</p>
                {event.trip_id && <p className="mt-1 truncate text-[10px] text-muted-foreground/70">Reis: {event.trip_id}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </OpsShell>
  );
}