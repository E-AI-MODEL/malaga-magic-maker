import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationPreferences } from "@/features/notifications/NotificationPreferences";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Gauge, LogOut, Mail, Plane, ShieldCheck, User, Users } from "lucide-react";

export default function Profiel() {
  const { profile, isAdmin, user, signOut } = useAuth();
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
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-5">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate("/trips")} aria-label="Terug naar mijn reizen">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold">Account</p>
            <p className="truncate text-xs text-muted-foreground">Profiel, meldingen en toegang</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:py-10">
        <section className="flex items-center gap-4 border-b border-border/70 pb-7">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">{profile?.display_name || "Account"}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email || profile?.username || ""}</p>
          </div>
          {isAdmin && (
            <span className="ml-auto hidden rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-primary sm:inline-flex">
              Platformbeheerder
            </span>
          )}
        </section>

        <div className="grid gap-12 pt-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-11">
            <section>
              <div className="mb-4">
                <h2 className="font-display text-lg font-extrabold">Persoonlijk</h2>
                <p className="mt-1 text-sm text-muted-foreground">Hoe je naam binnen Vakansie wordt weergegeven.</p>
              </div>
              <div className="border-y border-border/70 py-4">
                <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground" htmlFor="display-name">Weergavenaam</label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <Button
                    onClick={handleSave}
                    disabled={saving || !displayName.trim() || displayName === profile?.display_name}
                    className="h-11 rounded-xl"
                  >
                    {saving ? "Opslaan..." : "Opslaan"}
                  </Button>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-display text-lg font-extrabold">Meldingen</h2>
                <p className="mt-1 text-sm text-muted-foreground">Kies welke reisupdates je in Vakansie wilt zien.</p>
              </div>
              {user && <NotificationPreferences userId={user.id} />}
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-display text-lg font-extrabold">Toegang</h2>
                <p className="mt-1 text-sm text-muted-foreground">Je account en eventuele interne rechten.</p>
              </div>
              <div className="divide-y divide-border/70 border-y border-border/70">
                <div className="flex items-center gap-4 py-4">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">E-mailadres</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email || "Niet beschikbaar"}</p>
                  </div>
                </div>

                {isAdmin && (
                  <button type="button" onClick={() => navigate("/ops")} className="group flex w-full items-center gap-4 py-4 text-left">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">Platformbeheer</p>
                      <p className="mt-1 text-xs text-muted-foreground">Gebruikers, reizen, systeemgezondheid en logboek.</p>
                    </div>
                    <Gauge className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.11em] text-muted-foreground">Actieve reizen</h2>
                <span className="text-xs text-muted-foreground">{activeTrips.length}</span>
              </div>
              {activeTrips.length === 0 ? (
                <p className="border-y border-border/70 py-4 text-sm leading-relaxed text-muted-foreground">Op dit moment heb je geen actieve reis.</p>
              ) : (
                <div className="divide-y divide-border/70 border-y border-border/70">
                  {activeTrips.map((trip) => (
                    <button key={trip.id} type="button" onClick={() => navigate(`/trip/${trip.id}`)} className="group flex w-full items-center gap-3 py-3.5 text-left">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                        <Plane className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{trip.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />{trip.group_size || 1} {trip.group_size === 1 ? "reiziger" : "reizigers"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <Button
              variant="ghost"
              className="h-11 w-full justify-start rounded-xl px-0 text-muted-foreground hover:bg-transparent hover:text-destructive"
              onClick={() => void signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />Uitloggen
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}
