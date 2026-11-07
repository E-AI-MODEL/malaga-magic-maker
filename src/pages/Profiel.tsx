import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTrip } from "@/contexts/TripContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError, FormSheet } from "@/components/FormSheet";
import { formatIban, normalizeIban, paymentDetailsError } from "@/features/together/iban";
import { PageHeader } from "@/components/primitives";
import { NotificationPreferences } from "@/features/notifications/NotificationPreferences";
import { ReminderPreferences } from "@/features/notifications/ReminderPreferences";
import { toast } from "sonner";
import { Bell, ChevronRight, CreditCard, LogOut, Map as MapIcon, Settings, ShieldAlert, Sparkles, User } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { usePro } from "@/features/pro/usePro";
import { usePlanStatus } from "@/features/pro/limits";
import { PaymentHistory } from "@/features/pro/PaymentHistory";
import { DeleteAccountSection } from "@/features/account/DeleteAccountSection";

type ProfileSheet = "account" | "pro" | "betalen" | "meldingen" | "reizen" | "privacy";

export default function Profiel() {
  const [sheet, setSheet] = useState<ProfileSheet | null>(null);
  const { profile, refreshProfile, isAdmin, user, signOut } = useAuth();
  const { userTrips } = useTrip();
  const { isPro: hasCheckoutEntitlement, refresh: refreshPro } = usePro();
  const { status: plan, refresh: refreshPlan } = usePlanStatus();
  // Server plan status (is_pro_user) is authoritative, including Pro granted by Beheer.
  const isPro = plan ? plan.plan !== "free" : hasCheckoutEntitlement;
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  useEffect(() => { setDisplayName(profile?.display_name || ""); setUsername(profile?.username || ""); }, [profile?.display_name, profile?.username]);
  const [saving, setSaving] = useState(false);
  const [iban, setIban] = useState("");
  const [accountName, setAccountName] = useState("");
  const [ibanSaving, setIbanSaving] = useState(false);
  const [ibanError, setIbanError] = useState("");
  const activeTrips = userTrips.filter((trip) => trip.status !== "archived");

  const handleSave = async () => {
    if (!profile) return;
    const name = displayName.trim();
    const handle = username.trim().toLowerCase().replace(/^@/, "");
    if (!name) { toast.error("Vul je naam in"); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) { toast.error("Gebruikersnaam: 3 tot 20 tekens, alleen letters, cijfers en _"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name, username: handle }).eq("id", profile.id);
    if (error) toast.error(error.code === "23505" ? "Deze gebruikersnaam is al bezet" : "Opslaan lukt nu niet");
    else { toast.success("Opgeslagen"); await refreshProfile(); }
    setSaving(false);
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("payment_details")
      .select("iban, account_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) {
          setIban(data.iban ? formatIban(data.iban) : "");
          setAccountName(data.account_name || "");
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleSavePayment = async () => {
    if (!user) return;
    setIbanError("");
    const clean = normalizeIban(iban);
    const ibanCheck = paymentDetailsError(clean, accountName);
    if (ibanCheck) {
      setIbanError(ibanCheck);
      return;
    }
    setIbanSaving(true);
    if (!clean && !accountName.trim()) {
      const { error } = await supabase.from("payment_details").delete().eq("user_id", user.id);
      if (error) toast.error("Kon betaalgegevens niet verwijderen");
      else toast.success("Betaalgegevens verwijderd");
    } else {
      const { error } = await supabase.from("payment_details").upsert({
        user_id: user.id,
        iban: clean || null,
        account_name: accountName.trim() || null,
        updated_at: new Date().toISOString(),
      });
      if (error) toast.error("Kon betaalgegevens niet opslaan");
      else toast.success("Betaalgegevens opgeslagen");
    }
    setIbanSaving(false);
  };

  const handleDeletePayment = async () => {
    if (!user) return;
    setIbanSaving(true);
    const { error } = await supabase.from("payment_details").delete().eq("user_id", user.id);
    if (error) toast.error("Kon betaalgegevens niet verwijderen");
    else {
      setIban("");
      setAccountName("");
      toast.success("Betaalgegevens verwijderd");
    }
    setIbanSaving(false);
  };

  const tiles: { key: ProfileSheet; label: string; icon: typeof User; tone: string; show: boolean }[] = [
    { key: "account", label: "Account", icon: User, tone: "tile-vakansie text-primary-foreground", show: true },
    { key: "pro", label: isPro ? "Pro actief" : "Pro", icon: Sparkles, tone: "tile-knaakie text-primary-foreground", show: true },
    { key: "betalen", label: "Betaalgegevens", icon: CreditCard, tone: "tile-plain text-foreground", show: !!user },
    { key: "meldingen", label: "Meldingen", icon: Bell, tone: "tile-plain text-foreground", show: !!user },
    { key: "reizen", label: "Reizen", icon: MapIcon, tone: "tile-plain text-foreground", show: true },
    { key: "privacy", label: "Account wissen", icon: ShieldAlert, tone: "tile-plain text-foreground", show: !!user?.email },
  ];
  const sheetTitle: Record<ProfileSheet, string> = { account: "Account", pro: "Vakansie Pro", betalen: "Betaalgegevens", meldingen: "Meldingen", reizen: "Actieve reizen", privacy: "Account verwijderen" };

  return (
    <AppLayout>
      <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-2xl flex-col overflow-hidden px-5 pt-5 md:h-[calc(100dvh-4rem)]">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-brand text-lg font-semibold text-primary">
            {(profile?.display_name || user?.email || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <PageHeader title={profile?.display_name || "Reiziger"} />
            <p className="truncate text-xs text-muted-foreground">{profile?.username ? `@${profile.username}` : user?.email || ""}</p>
          </div>
        </div>

        <div className="mt-5 grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 pb-3">
          {tiles.filter((tile) => tile.show).map((tile) => (
            <button key={tile.key} onClick={() => setSheet(tile.key)} className={`${tile.tone} flex flex-col justify-between rounded-2xl p-4 text-left`}>
              <tile.icon className="h-6 w-6" strokeWidth={1.75} />
              <span className="font-brand text-lg font-semibold leading-tight">{tile.label}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pb-4">
          {isAdmin && (
            <button onClick={() => navigate("/ops")} className="tile-plain flex h-14 items-center gap-2 rounded-2xl px-4 text-left text-foreground">
              <Settings className="h-5 w-5" strokeWidth={1.75} />
              <span className="font-brand text-base font-semibold">Beheer</span>
            </button>
          )}
          <button onClick={() => void signOut()} className={`tile-plain flex h-14 items-center gap-2 rounded-2xl px-4 text-left text-destructive ${isAdmin ? "" : "col-span-2"}`}>
            <LogOut className="h-5 w-5" />
            <span className="font-brand text-base font-semibold">Uitloggen</span>
          </button>
        </div>
      </div>

      <FormSheet open={sheet !== null} onOpenChange={(open) => !open && setSheet(null)} title={sheet ? sheetTitle[sheet] : ""}>
        {sheet === "account" && (<>
        <section >
          
          <div className="mt-3">
            <label htmlFor="profile-name" className="mb-1.5 block text-sm font-semibold">Naam</label>
            <Input id="profile-name" value={displayName} maxLength={60} onChange={(event) => setDisplayName(event.target.value)} />
            <label htmlFor="profile-username" className="mb-1.5 mt-3 block text-sm font-semibold">Gebruikersnaam</label>
            <Input id="profile-username" value={username} maxLength={21} autoCapitalize="none" autoCorrect="off" onChange={(event) => setUsername(event.target.value)} />
            <Button onClick={handleSave} disabled={saving || (displayName === profile?.display_name && username === profile?.username)} className="mt-3 h-12 w-full">
              {saving ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </section>

        </>)}
        {sheet === "pro" && (<>
        <section >
          
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
            {plan && (
              <dl className="py-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between py-0.5">
                  <dt>Eigen reizen</dt>
                  <dd className="text-foreground">
                    {plan.tripsOwned}
                    {plan.tripLimit === null ? " (onbeperkt)" : ` van ${plan.tripLimit}`}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <dt>Hansie-vragen vandaag</dt>
                  <dd className="text-foreground">{plan.hansieUsedToday} van {plan.hansieDayLimit}</dd>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <dt>Documenten per reis</dt>
                  <dd className="text-foreground">{plan.documentLimitPerTrip}</dd>
                </div>
                {plan.proEnvironment === "sandbox" && (
                  <p className="pt-2 text-[11px]">Pro staat actief op basis van een testbetaling in de preview.</p>
                )}
              </dl>
            )}
          </div>
        </section>

        <PaymentHistory
          onRecovered={() => {
            void refreshPro();
            void refreshPlan();
          }}
        />

        </>)}
        {sheet === "betalen" && (<>
        {user && (
          <section >
            
            <p className="mt-2 text-xs text-muted-foreground">Alleen jij ziet dit. Het komt alleen in betaalverzoeken die jij zelf verstuurt.</p>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="iban-input">IBAN</label>
                <Input
                  id="iban-input"
                  value={iban}
                  onChange={(event) => setIban(event.target.value)}
                  placeholder="NL91 ABNA 0417 1643 00"
                  className="h-10"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="account-name-input">Ten name van</label>
                <Input
                  id="account-name-input"
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  className="h-10"
                  autoComplete="off"
                />
              </div>
              {ibanError && <FormError message={ibanError} />}
              <div className="flex gap-2">
                <Button onClick={() => void handleSavePayment()} disabled={ibanSaving} className="h-10">
                  {ibanSaving ? "..." : "Opslaan"}
                </Button>
                <Button variant="outline" onClick={() => void handleDeletePayment()} disabled={ibanSaving} className="h-10">
                  Verwijderen
                </Button>
              </div>
            </div>
          </section>
        )}

        </>)}
        {sheet === "meldingen" && (<>
        {user && (
          <section >
            
            <div className="mt-2">
              <NotificationPreferences userId={user.id} />
              <ReminderPreferences userId={user.id} />
            </div>
          </section>
        )}

        </>)}
        {sheet === "reizen" && (<>
        <section >
          
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

        </>)}
        {sheet === "privacy" && (<>
        {user?.email && (
          <DeleteAccountSection
            email={user.email}
            isAdmin={isAdmin}
            onDeleted={async () => {
              await supabase.auth.signOut().catch(() => undefined);
              localStorage.clear();
              window.location.replace("/");
            }}
          />
        )}
        </>)}
      </FormSheet>
    </AppLayout>
  );
}
