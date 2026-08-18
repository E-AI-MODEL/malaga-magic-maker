import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Copy, Settings, User, Users } from "lucide-react";

export default function Profiel() {
  const { profile, isAdmin } = useAuth();
  const { userTrips, activeTrip } = useTrip();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile || !displayName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("id", profile.id);
    if (error) {
      toast.error("Kon naam niet opslaan");
    } else {
      toast.success("Naam bijgewerkt");
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="space-y-8 px-6 py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold">{profile?.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Weergavenaam
          </label>
          <div className="flex gap-2">
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-11"
            />
            <Button onClick={handleSave} disabled={saving || displayName === profile?.display_name} className="h-11">
              {saving ? "..." : "Opslaan"}
            </Button>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate("/ops")}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-extrabold">Beheer</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Interne omgeving voor gebruikers, reizen en systeemcontrole.</p>
            </div>
          </button>
        )}

        <div>
          <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
            Mijn vakanties ({userTrips.length})
          </h2>
          <div className="space-y-3">
            {userTrips.map((trip) => (
              <Card key={trip.id} className={`border-border/60 ${trip.id === activeTrip?.id ? "ring-2 ring-primary/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display font-bold">{trip.name}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        {trip.start_date && trip.end_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(`${trip.start_date}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – {new Date(`${trip.end_date}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {trip.group_size}
                        </span>
                      </div>
                      {trip.description && <p className="mt-1 text-xs text-muted-foreground">{trip.description}</p>}
                    </div>
                    {trip.id === activeTrip?.id && (
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Actief</span>
                    )}
                  </div>
                  {trip.invite_code && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(trip.invite_code || "");
                        toast("Code gekopieerd!");
                      }}
                      className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                      <span className="font-mono tracking-wider">{trip.invite_code}</span>
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
