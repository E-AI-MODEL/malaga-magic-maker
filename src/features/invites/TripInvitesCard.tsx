import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, Loader2, Plus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvite, listInvites, revokeInvite } from "./data";

function inviteStatus(invite: Awaited<ReturnType<typeof listInvites>>[number]) {
  if (invite.revoked_at) return "Ingetrokken";
  if (new Date(invite.expires_at).getTime() <= Date.now()) return "Verlopen";
  if (invite.use_count >= invite.max_uses) return "Gebruikt";
  return "Actief";
}

export function TripInvitesCard({ tripId }: { tripId: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [expiresHours, setExpiresHours] = useState(168);
  const [maxUses, setMaxUses] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [newLink, setNewLink] = useState("");
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ["trip-invites", tripId],
    queryFn: () => listInvites(tripId),
  });

  const targeted = email.trim().length > 0;

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNewLink("");
    setCopied(false);
    setCreating(true);
    try {
      const token = await createInvite({
        tripId,
        email: email.trim() || null,
        expiresHours,
        maxUses: targeted ? 1 : maxUses,
      });
      if (!token) throw new Error("No invite token returned");
      setNewLink(`${window.location.origin}/join/${token}`);
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["trip-invites", tripId] });
    } catch (caught) {
      console.error("invite create failed", caught);
      setError("De uitnodiging kon niet worden gemaakt.");
    } finally {
      setCreating(false);
    }
  };

  const copyNewLink = async () => {
    if (!newLink) return;
    await navigator.clipboard.writeText(newLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleRevoke = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId);
      await queryClient.invalidateQueries({ queryKey: ["trip-invites", tripId] });
    } catch (caught) {
      console.error("invite revoke failed", caught);
      setError("De uitnodiging kon niet worden ingetrokken.");
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <UserPlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-lg font-extrabold">Mensen uitnodigen</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Maak een tijdelijke link voor iemand specifiek of voor een kleine groep. Nieuwe deelnemers krijgen altijd de rol medereiziger.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mt-5 space-y-4">
        <div>
          <label htmlFor="invite-email" className="text-sm font-semibold">E-mailadres, optioneel</label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="naam@example.com"
            className="mt-2 h-11"
          />
          <p className="mt-1 text-xs text-muted-foreground">Met een e-mailadres kan alleen dat account de uitnodiging gebruiken.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="invite-expiry" className="text-sm font-semibold">Geldig</label>
            <select id="invite-expiry" value={expiresHours} onChange={(event) => setExpiresHours(Number(event.target.value))} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value={24}>1 dag</option>
              <option value={72}>3 dagen</option>
              <option value={168}>7 dagen</option>
              <option value={336}>14 dagen</option>
              <option value={720}>30 dagen</option>
            </select>
          </div>
          <div>
            <label htmlFor="invite-uses" className="text-sm font-semibold">Te gebruiken door</label>
            <select id="invite-uses" value={targeted ? 1 : maxUses} disabled={targeted} onChange={(event) => setMaxUses(Number(event.target.value))} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60">
              <option value={1}>1 persoon</option>
              <option value={3}>3 personen</option>
              <option value={5}>5 personen</option>
              <option value={10}>10 personen</option>
            </select>
          </div>
        </div>

        <Button type="submit" disabled={creating} className="w-full sm:w-auto">
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Uitnodiging maken
        </Button>
      </form>

      {newLink && (
        <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Kopieer deze link nu</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{newLink}</p>
              <p className="mt-2 text-xs text-muted-foreground">Om veiligheidsredenen kan deze exacte link later niet opnieuw worden opgehaald.</p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => void copyNewLink()} className="mt-3">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Gekopieerd" : "Kopieer link"}
          </Button>
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

      <div className="mt-6 border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Uitnodigingen</h3>
          <span className="text-xs text-muted-foreground">{query.data?.length || 0}</span>
        </div>
        {query.isLoading ? (
          <div className="h-20 animate-pulse rounded-xl bg-secondary" />
        ) : !query.data?.length ? (
          <p className="text-sm text-muted-foreground">Nog geen uitnodigingen gemaakt.</p>
        ) : (
          <div className="space-y-2">
            {query.data.map((invite) => {
              const status = inviteStatus(invite);
              const active = status === "Actief";
              return (
                <div key={invite.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{invite.email_normalized || "Iedereen met de link"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {status} · {invite.use_count}/{invite.max_uses} gebruikt · tot {new Date(invite.expires_at).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  {active && (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => void handleRevoke(invite.id)} aria-label="Uitnodiging intrekken">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
