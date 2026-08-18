import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, MessageCircle, MonitorX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getOpsSummary } from "@/features/ops/data";
import { listRecentClientErrors } from "@/features/ops/errors";

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
  const summary = useQuery({ queryKey: ["ops-summary"], queryFn: getOpsSummary });
  const errors = useQuery({ queryKey: ["ops-client-errors"], queryFn: listRecentClientErrors });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops")} aria-label="Terug naar Beheer">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="font-display text-sm font-extrabold">Fouten</p>
            <p className="text-xs text-muted-foreground">Interne signalen uit de afgelopen gebruikssessies</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <MessageCircle className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs text-muted-foreground">Hansie · laatste 24 uur</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{summary.data?.hansie_requests_24h ?? "…"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <MonitorX className="h-5 w-5 text-primary" />
            <p className="mt-3 text-xs text-muted-foreground">Browserfouten · laatste 24 uur</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{summary.data?.client_errors_24h ?? "…"}</p>
          </div>
        </div>

        <section className="mt-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="font-display text-xl font-extrabold">Recente browserfouten</h1>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Alleen opgeschoonde foutmeldingen en beperkte technische context worden hier bewaard. Geen wachtwoorden, documenten of Hansie-gesprekken.
              </p>
            </div>
          </div>

          {errors.isLoading ? (
            <div className="mt-5 space-y-2">
              {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl border border-border bg-card" />)}
            </div>
          ) : errors.isError ? (
            <p className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">De foutmeldingen konden niet worden geladen.</p>
          ) : (errors.data?.length || 0) === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">Geen recente browserfouten.</div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
              {errors.data?.map((event, index) => (
                <article key={event.id} className={`px-4 py-4 ${index > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{event.area}</p>
                    <span className="text-[11px] text-muted-foreground">{formatDate(event.created_at)}</span>
                  </div>
                  <p className="mt-1 break-words text-sm text-foreground/80">{event.message}</p>
                  {event.trip_id && <p className="mt-2 truncate text-[10px] text-muted-foreground">Reis: {event.trip_id}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
