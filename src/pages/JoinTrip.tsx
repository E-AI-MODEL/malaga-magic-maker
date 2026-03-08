import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
      // Save invite code and redirect to login
      if (inviteCode) {
        localStorage.setItem("vakansie_pending_invite", inviteCode);
      }
      navigate("/login", { replace: true });
      return;
    }

    if (!inviteCode) {
      setStatus("error");
      setError("Geen uitnodigingscode gevonden");
      return;
    }

    joinTrip(inviteCode).then((result) => {
      if (result.error) {
        setStatus("error");
        setError(result.error);
      } else {
        setStatus("success");
        setTimeout(() => navigate("/taken", { replace: true }), 1500);
      }
    });
  }, [user, authLoading, inviteCode]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Deelnemen aan vakantie...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-4xl mb-4">🎉</div>
            <p className="font-bold text-lg">Welkom!</p>
            <p className="text-muted-foreground text-sm mt-1">Je wordt doorgestuurd...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-4xl mb-4">😕</div>
            <p className="font-bold text-lg">Oeps</p>
            <p className="text-muted-foreground text-sm mt-1">{error}</p>
            <button onClick={() => navigate("/taken")} className="text-primary text-sm font-semibold mt-4 hover:underline">
              Ga naar home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
