import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionLabel } from "@/components/primitives";
import { FormError } from "@/components/FormSheet";

export function DeleteAccountSection({ email, isAdmin, onDeleted }: { email: string; isAdmin: boolean; onDeleted: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  const confirm = async () => {
    setBusy(true);
    setError("");
    const { data, error: fnError } = await supabase.functions.invoke("delete-account", { body: { email: typed.trim() } });
    if (fnError || !data?.ok) {
      let reason = "Verwijderen is niet gelukt. Probeer het later opnieuw.";
      const ctx = (fnError as { context?: Response } | null)?.context;
      const body = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) as { error?: string } | null : null;
      if (body?.error) reason = body.error;
      setError(reason);
      setBusy(false);
      return;
    }
    await onDeleted();
  };

  return (
    <section className="mt-8">
      <SectionLabel>Account verwijderen</SectionLabel>
      {isAdmin ? (
        <p className="py-3 text-sm text-muted-foreground">
          Je bent platformbeheerder. Een beheerder kan zichzelf niet verwijderen; laat eerst je beheerrol intrekken door een andere beheerder.
        </p>
      ) : (
        <>
          <p className="py-2 text-sm text-muted-foreground">
            Je account en je gegevens worden direct gewist. Reizen waarin je alleen zit, verdwijnen met hun documenten. In gedeelde reizen neemt de reiziger die er het langst bij is je rol als organisator over.
          </p>
          <Button variant="outline" className="h-10 text-destructive" onClick={() => { setTyped(""); setError(""); setOpen(true); }}>
            Account verwijderen
          </Button>
        </>
      )}
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account verwijderen</DialogTitle>
            <DialogDescription>Dit kun je niet terugdraaien. Typ je e-mailadres om te bevestigen.</DialogDescription>
          </DialogHeader>
          <label htmlFor="delete-email" className="text-xs text-muted-foreground">E-mailadres</label>
          <Input id="delete-email" type="email" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={email} className="h-11" />
          {error && <FormError message={error} />}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuleren</Button>
            <Button variant="destructive" onClick={() => void confirm()} disabled={!matches || busy}>
              {busy ? "Bezig..." : "Definitief verwijderen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
