import { useEffect } from "react";
import { useTrip } from "@/contexts/TripContext";
import { reportClientError } from "./clientErrors";

export function ClientErrorReporter() {
  const { activeTrip } = useTrip();

  useEffect(() => {
    const recent = new Map<string, number>();

    const shouldReport = (area: string, message: string) => {
      const key = `${area}:${message}`;
      const now = Date.now();
      const previous = recent.get(key) || 0;
      if (now - previous < 60_000) return false;
      recent.set(key, now);
      return true;
    };

    const onError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : event.message;
      const message = error instanceof Error ? error.message : String(error || "Onbekende browserfout");
      if (!shouldReport("window.error", message)) return;
      void reportClientError({
        area: "window.error",
        error,
        tripId: activeTrip?.id || null,
        context: { online: navigator.onLine, visibility: document.visibilityState },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error || typeof event.reason === "string"
        ? event.reason
        : "Onbehandelde promise-fout";
      const message = error instanceof Error ? error.message : String(error);
      if (!shouldReport("unhandledrejection", message)) return;
      void reportClientError({
        area: "unhandledrejection",
        error,
        tripId: activeTrip?.id || null,
        context: { online: navigator.onLine, visibility: document.visibilityState },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [activeTrip?.id]);

  return null;
}
