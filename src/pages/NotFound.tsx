import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { reportClientError } from "@/features/observability/clientErrors";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    void reportClientError({
      area: "route_not_found",
      error: `404 op ${location.pathname}`,
    });
  }, [location.pathname]);

  return (
    <main className="min-h-screen bg-background px-5 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Pagina niet gevonden
        </span>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-foreground">
          Deze pagina staat niet in het dossier
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          De link klopt niet meer of de reis is verwijderd. Ga terug naar je reizen om verder te werken.
        </p>

        <div className="mt-8 border-t border-border/70">
          <Link
            to="/trips"
            className="flex items-center justify-between border-b border-border/70 py-4 text-sm text-foreground"
          >
            <span className="flex items-center gap-3">
              <Compass className="h-4 w-4 text-muted-foreground" />
              Naar Mijn reizen
            </span>
            <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex w-full items-center justify-between border-b border-border/70 py-4 text-sm text-foreground"
          >
            <span className="flex items-center gap-3">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              Vorige pagina
            </span>
          </button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
