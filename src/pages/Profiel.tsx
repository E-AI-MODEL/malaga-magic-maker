import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { User, MapPin, Calendar, Copy, Users } from "lucide-react";

export default function Profiel() {
  const { profile } = useAuth();
  const { userTrips, activeTrip, isOrganizer } = useTrip();
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
      <div className="px-6 py-8 space-y-8">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold">{profile?.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          </div>
        </div>

        {/* Edit name */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
            Weergavenaam
          </label>
          <div className="flex gap-2">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-11"
            />
            <Button onClick={handleSave} disabled={saving || displayName === profile?.display_name} className="h-11">
              {saving ? "..." : "Opslaan"}
            </Button>
          </div>
        </div>

        {/* Trips overview */}
        <div>
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-3">
            Mijn vakanties ({userTrips.length})
          </h2>
          <div className="space-y-3">
            {userTrips.map((trip) => (
              <Card key={trip.id} className={`border-border/60 ${trip.id === activeTrip?.id ? "ring-2 ring-primary/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display font-bold">{trip.name}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(trip.start_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – {new Date(trip.end_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {trip.group_size}
                        </span>
                      </div>
                      {trip.description && (
                        <p className="text-xs text-muted-foreground mt-1">{trip.description}</p>
                      )}
                    </div>
                    {trip.id === activeTrip?.id && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">Actief</span>
                    )}
                  </div>
                  {trip.invite_code && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(trip.invite_code || ""); toast("Code gekopieerd!"); }}
                      className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
