import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/primitives";
import { NotificationPreferences } from "@/features/notifications/NotificationPreferences";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, LogOut, Sparkles } from "lucide-react";
import { usePro } from "@/features/pro/usePro";

export default function Profiel() {
  const { profile, isAdmin, user, signOut } = useAuth();
  const { userTrips } = useTrip();
  const { isPro } = usePro();
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
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-2.5">
          <Button variant="ghost" size="icon" onClick={() => navigate("/trips")} aria-label="Terug naar mijn reizen">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-semibold tracking-tight">Profiel</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-7">
        <div className="flex items-center gap-3 border-b border-rule/10 pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-brand text-lg font-semibold text-primary">
            {(profile?.display_name || user?.email || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-brand text-xl font-semibold tracking-tight">{profile?.display_name || "Reiziger"}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.username ? `@${profile.username}` : ""}
              {profile?.username && user?.email ? " · " : ""}
              {user?.email || ""}
            </p>
            {isPro && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" strokeWidth={1.75} />
                Pro
              </span>
            )}
          </div>
        </div>

        <section className="mt-7">
          <SectionLabel>Vakansie Pro</SectionLabel>
          <div className="mt-1 rule-divide">
            <button onClick={() => navigate("/steun")} className="flex w-full items-center gap-3 py-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">
                  {isPro ? "Pro is actief" : "Pro ontgrendelen"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {isPro
                    ? "Bedankt voor je bijdrage. Er loopt geen abonnement."
                    : "Eenmalige bijdrage vanaf € 2. Geen abonnement."}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            </button>
          </div>
        </section>

        <section className="mt-7">
          <SectionLabel>Account</SectionLabel>
          <div className="mt-3">
            <label className="mb-1.5 block text-xs text-muted-foreground">Weergavenaam</label>
            <div className="flex gap-2">
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-10" />
              <Button onClick={handleSave} disabled={saving || displayName === profile?.display_name} className="h-10">
                {saving ? "..." : "Opslaan"}
              </Button>
            </div>
          </div>
        </section>

        {user && (
          <section className="mt-8">
            <SectionLabel>Meldingen</SectionLabel>
            <div className="mt-2">
              <NotificationPreferences userId={user.id} />
            </div>
          </section>
        )}

        {isAdmin && (
          <section className="mt-8">
            <SectionLabel>Toegang</SectionLabel>
            <div className="mt-1 rule-divide">
              <button onClick={() => navigate("/ops")} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">Beheer</span>
                  <span className="block text-xs text-muted-foreground">Interne omgeving voor gebruikers, reizen en systeemcontrole.</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              </button>
            </div>
          </section>
        )}

        <section className="mt-8">
          <SectionLabel>Actieve reizen</SectionLabel>
          {activeTrips.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              Je hebt op dit moment geen actieve reis. Gearchiveerde reizen vind je via Mijn reizen.
            </p>
          ) : (
            <div className="mt-1 rule-divide">
              {activeTrips.map((trip) => (
                <button key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{trip.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {trip.start_date && trip.end_date
                        ? `${new Date(`${trip.start_date}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – ${new Date(`${trip.end_date}T12:00:00`).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}`
                        : "Data nog niet gekozen"}
                      {trip.group_size ? ` · ${trip.group_size} reizigers` : ""}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <SectionLabel>Sessie</SectionLabel>
          <div className="mt-1 rule-divide">
            <button onClick={() => void signOut()} className="flex w-full items-center gap-3 py-3 text-left text-destructive">
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-[15px] font-medium">Uitloggen</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}