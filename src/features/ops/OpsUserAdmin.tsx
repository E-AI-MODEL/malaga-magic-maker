import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PRO_DURATIONS,
  addOpsTripMember,
  createOpsUser,
  getOpsUserAccess,
  grantOpsPro,
  proExpiry,
  revokeOpsPro,
  searchOpsTrips,
  sendOpsRecovery,
  setOpsAdminRole,
  setOpsUserBlocked,
} from "./data";

const selectClass = "h-10 rounded-md border border-input bg-background px-2 text-base";

function errorText(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  if (msg.includes("last_admin")) return "Er moet minstens één beheerder overblijven.";
  if (msg.includes("cannot_remove_own_admin") || msg.includes("cannot_block_self")) return "Dit kun je niet bij je eigen account doen.";
  if (msg.includes("already been registered") || msg.includes("already registered")) return "Dit e-mailadres heeft al een account.";
  if (msg.includes("password_too_short")) return "Wachtwoord moet minstens 10 tekens zijn.";
  if (msg.includes("invalid_email")) return "Ongeldig e-mailadres.";
  return "Dit lukte niet. Probeer het opnieuw.";
}

function useInvalidate() {
  const qc = useQueryClient();
  return (userId?: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["ops-users"] }),
      qc.invalidateQueries({ queryKey: ["ops-audit"] }),
      qc.invalidateQueries({ queryKey: ["ops-summary"] }),
      userId ? qc.invalidateQueries({ queryKey: ["ops-user", userId] }) : null,
      userId ? qc.invalidateQueries({ queryKey: ["ops-user-access", userId] }) : null,
    ]);
}

function TripRoleFields({ tripId, setTripId, role, setRole }: { tripId: string; setTripId: (v: string) => void; role: string; setRole: (v: "organizer" | "member") => void }) {
  const trips = useQuery({ queryKey: ["ops-trips", ""], queryFn: () => searchOpsTrips("") });
  return (
    <div className="flex flex-wrap gap-2">
      <select aria-label="Reis" className={`${selectClass} min-w-0 flex-1`} value={tripId} onChange={(e) => setTripId(e.target.value)}>
        <option value="">Geen reis</option>
        {trips.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      {tripId && (
        <select aria-label="Rol in reis" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as "organizer" | "member")}>
          <option value="member">Reiziger</option>
          <option value="organizer">Organisator</option>
        </select>
      )}
    </div>
  );
}

export function OpsCreateUser() {
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"invite" | "password">("invite");
  const [password, setPassword] = useState("");
  const [proDays, setProDays] = useState<string>("none");
  const [tripId, setTripId] = useState("");
  const [role, setRole] = useState<"organizer" | "member">("member");
  const [message, setMessage] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { userId } = await createOpsUser({ email, displayName: name, mode, password: mode === "password" ? password : undefined });
      if (!userId) throw new Error("create_failed");
      if (proDays !== "none") await grantOpsPro(userId, "Bij aanmaken", proExpiry(proDays === "forever" ? null : Number(proDays)));
      if (tripId) await addOpsTripMember(tripId, userId, role);
      return userId;
    },
    onSuccess: async () => {
      setMessage(mode === "invite" ? `Uitnodiging verstuurd naar ${email}.` : `Account voor ${email} aangemaakt.`);
      setName(""); setEmail(""); setPassword(""); setProDays("none"); setTripId("");
      await invalidate();
    },
    onError: (e) => setMessage(errorText(e)),
  });

  const submit = (e: FormEvent) => { e.preventDefault(); setMessage(""); create.mutate(); };

  if (!open) {
    return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Nieuwe gebruiker</Button>;
  }
  return (
    <form onSubmit={submit} className="max-w-xl space-y-3 border-b border-rule/10 pb-5">
      <p className="text-[13px] font-semibold text-foreground/70">Nieuwe gebruiker</p>
      <Input required placeholder="Naam" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <Input required type="email" placeholder="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" checked={mode === "invite"} onChange={() => setMode("invite")} />Uitnodigingsmail sturen</label>
        <label className="flex items-center gap-2"><input type="radio" checked={mode === "password"} onChange={() => setMode("password")} />Tijdelijk wachtwoord</label>
      </div>
      {mode === "password" && <Input required type="text" placeholder="Wachtwoord (min. 10 tekens)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} />}
      <select aria-label="Pro" className={`${selectClass} w-full`} value={proDays} onChange={(e) => setProDays(e.target.value)}>
        <option value="none">Geen Pro</option>
        {PRO_DURATIONS.map((d) => <option key={d.label} value={d.days === null ? "forever" : String(d.days)}>Pro · {d.label}</option>)}
      </select>
      <TripRoleFields tripId={tripId} setTripId={setTripId} role={role} setRole={setRole} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={create.isPending}>{create.isPending ? "Bezig…" : "Aanmaken"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Sluiten</Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </form>
  );
}

export function OpsUserActions({ userId, onDelete, deleting }: { userId: string; onDelete: () => void; deleting: boolean }) {
  const invalidate = useInvalidate();
  const access = useQuery({ queryKey: ["ops-user-access", userId], queryFn: () => getOpsUserAccess(userId) });
  const [proDays, setProDays] = useState("365");
  const [note, setNote] = useState("");
  const [tripId, setTripId] = useState("");
  const [role, setRole] = useState<"organizer" | "member">("member");
  const [message, setMessage] = useState("");

  const run = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => { await fn(); },
    onSuccess: async () => { setMessage("Opgeslagen."); await invalidate(userId); },
    onError: (e) => setMessage(errorText(e)),
  });
  const act = (fn: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setMessage("");
    run.mutate(fn);
  };

  const a = access.data;
  const blocked = Boolean(a?.banned_until && new Date(a.banned_until) > new Date());
  const proLabel = !a ? "…" : !a.pro_active ? "Geen Pro" : a.pro_until ? `Pro tot ${new Date(a.pro_until).toLocaleDateString("nl-NL")}` : "Pro zonder einddatum";

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{proLabel}</span>
        <span>{a?.is_admin ? "Beheerder" : "Geen beheerder"}</span>
        <span>{blocked ? "Geblokkeerd" : "Actief"}</span>
      </div>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-foreground/70">Pro</p>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Duur" className={selectClass} value={proDays} onChange={(e) => setProDays(e.target.value)}>
            {PRO_DURATIONS.map((d) => <option key={d.label} value={d.days === null ? "forever" : String(d.days)}>{d.label}</option>)}
          </select>
          <Input className="min-w-0 flex-1" placeholder="Reden (optioneel)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => act(() => grantOpsPro(userId, note || undefined, proExpiry(proDays === "forever" ? null : Number(proDays))))}>Pro toekennen</Button>
          <Button size="sm" variant="outline" disabled={run.isPending || !a?.pro_active} onClick={() => act(() => revokeOpsPro(userId, note || undefined), "Pro intrekken?")}>Pro intrekken</Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-foreground/70">Aan reis toevoegen</p>
        <TripRoleFields tripId={tripId} setTripId={setTripId} role={role} setRole={setRole} />
        <Button size="sm" variant="outline" disabled={run.isPending || !tripId} onClick={() => act(() => addOpsTripMember(tripId, userId, role))}>Toevoegen</Button>
      </div>

      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-foreground/70">Account</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => act(() => sendOpsRecovery(userId))}>Herstelmail sturen</Button>
          <Button size="sm" variant="outline" disabled={run.isPending || !a} onClick={() => act(() => setOpsUserBlocked(userId, !blocked), blocked ? "Account deblokkeren?" : "Account blokkeren? De gebruiker kan dan niet meer inloggen.")}>{blocked ? "Deblokkeren" : "Blokkeren"}</Button>
          <Button size="sm" variant="outline" disabled={run.isPending || !a} onClick={() => act(() => setOpsAdminRole(userId, !a?.is_admin), a?.is_admin ? "Beheerdersrol afnemen?" : "Deze gebruiker beheerder maken? Diegene krijgt volledige toegang tot Beheer.")}>{a?.is_admin ? "Beheerder afnemen" : "Beheerder maken"}</Button>
          <Button size="sm" variant="destructive" disabled={deleting} onClick={() => { if (window.confirm("Dit account definitief verwijderen? Dit kan niet ongedaan worden gemaakt.")) onDelete(); }}>Gebruiker verwijderen</Button>
        </div>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
