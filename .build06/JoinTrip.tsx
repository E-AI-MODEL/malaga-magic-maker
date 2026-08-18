import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2, LogIn, MapPin, UserPlus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { INVITE_SIGNUP_ENABLED, PRELAUNCH_ACCESS_RESTRICTED } from "@/config/access";
import { acceptInvite, getInvitePreview } from "@/features/invites/data";

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export default function JoinTrip() {
  const { inviteToken = "" } = useParams<{ inviteToken: string }>();
  const { user, loading: authLoading } = useAuth();
  const { refreshTrips, openTrip } = useTrip();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const previewQuery = useQuery({
    queryKey: ["invite-preview", inviteToken],
    queryFn: () => getInvitePreview(inviteToken),
    enabled: Boolean(inviteToken),
    retry: false,
  });

  const next = `/join/${inviteToken}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  const handleAccept = async () => {
    setError("");
    setJoining(true);
    try {
      const tripId = await acceptInvite(inviteToken);
      if (!tripId) throw new Error("No trip returned");
      await refreshTrips();
      await openTrip(tripId);
      navigate(`/trip/${tripId}`, { replace: true });
    } catch (caught) {
      console.error("invite acceptance failed", caught);
      setError("Deze uitnodiging kan niet worden gebruikt. Hij kan verlopen, ingetrokken of voor een ander account bedoeld zijn.");
    } finally {
      setJoining(false);
    }
  };

  if (previewQuery.isLoading || authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  const preview = previewQuery.data;
  if (previewQuery.isError || !preview?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
          <h1 className="font-display text-2xl font-extrabold">Uitnodiging niet beschikbaar</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">De link is ongeldig, verlopen, ingetrokken of al volledig gebruikt.</p>
          <Button asChild variant="outline" className="mt-6"><Link to="/trips">Naar Vakansie</Link></Button>
        </div>
      </div>
    );
  }

  const dates = preview.start_date || preview.end_date
    ? [formatDate(preview.start_date), formatDate(preview.end_date)].filter(Boolean).join(" – ")
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Uitnodiging</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Doe mee met {preview.trip_name}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Je bent uitgenodigd als medereiziger.</p>

        <div className="mt-6 space-y-3 rounded-2xl bg-secondary/55 p-4 text-sm">
          {preview.destination_name && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{preview.destination_name}</p>}
          {dates && <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{dates}</p>}
          {preview.email_restricted && <p className="text-xs text-muted-foreground">Deze uitnodiging is gekoppeld aan één e-mailadres.</p>}
        </div>

        {user ? (
          <Button onClick={() => void handleAccept()} disabled={joining} className="mt-6 h-12 w-full font-bold">
            {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deelnemen aan deze reis
          </Button>
        ) : (
          <div className="mt-6 space-y-3">
            <Button asChild className="h-12 w-full font-bold"><Link to={loginHref}><LogIn className="mr-2 h-4 w-4" />Inloggen</Link></Button>
            {INVITE_SIGNUP_ENABLED ? (
              <Button asChild variant="outline" className="h-12 w-full font-bold"><Link to={signupHref}><UserPlus className="mr-2 h-4 w-4" />Account maken</Link></Button>
            ) : PRELAUNCH_ACCESS_RESTRICTED ? (
              <p className="text-center text-xs leading-relaxed text-muted-foreground">Nieuwe accounts zijn in deze privéversie nog niet geopend. Heb je al toegang, log dan in.</p>
            ) : null}
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
      </div>
    </div>
  );
}
