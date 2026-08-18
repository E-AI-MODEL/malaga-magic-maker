import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationPreferences } from "@/features/notifications/NotificationPreferences";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Settings, User, Users } from "lucide-react";

export default function Profiel() {
  const { profile, isAdmin, user } = useAuth();
  const { userTrips } = useTrip();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [saving, setSaving] = useState(false);
  const activeTrips = userTrips.filter((trip) => trip.status !== "archived");

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/trips")} aria-label="Terug naar mijn reizen">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="font-display text-sm font-extrabold">Profiel</p>
            <p className="text-xs text-muted-foreground">Account en voorkeuren</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8">
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

        {user && <NotificationPreferences userId={user.id} />}

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

        <section>
          <h2 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
            Actieve reizen ({activeTrips.length})
          </h2>
          {activeTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Je hebt op dit moment geen actieve reis. Gearchiveerde reizen vind je via Mijn reizen.
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrips.map((trip) => (
                <Card key={trip.id} className="border-border/60">
                  <CardContent className="p-4">
                    <button onClick={() => navigate(`/trip/${trip.id}`)} className="w-full text-left">
                      <p className="font-display font-bold">{trip.name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
