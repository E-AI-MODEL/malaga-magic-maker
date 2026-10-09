import { AlertTriangle, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";

export default function JoinTrip() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, loading: authLoading } = useAuth();
  const { joinTrip } = useTrip();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (inviteCode) localStorage.setItem("vakansie_pending_invite", inviteCode);
      navigate(inviteCode ? `/login?next=${encodeURIComponent(`/join/${inviteCode}`)}` : "/login", { replace: true });
      return;
    }

    if (!inviteCode) {
      setStatus("error");
      setError("Geen uitnodigingscode gevonden");
      return;
    }

    let cancelled = false;
    joinTrip(inviteCode).then((result) => {
      if (cancelled) return;
      if (result.error || !result.tripId) {
        setStatus("error");
        setError(result.error || "De reis kon niet worden geopend");
      } else {
        setStatus("success");
        window.setTimeout(() => navigate(`/trip/${result.tripId}`, { replace: true }), 900);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, inviteCode, joinTrip, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Uitnodiging controleren...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/10">
              <Check className="h-6 w-6 text-primary" strokeWidth={2} />
            </div>
            <p className="text-lg font-bold">Je doet mee</p>
            <p className="mt-1 text-sm text-muted-foreground">De reis wordt geopend...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-warning/15">
              <AlertTriangle className="h-6 w-6 text-warning" strokeWidth={1.75} />
            </div>
            <p className="text-lg font-bold">Uitnodiging werkt niet</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <button onClick={() => navigate("/trips")} className="mt-4 text-sm font-semibold text-primary hover:underline">
              Naar mijn reizen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
