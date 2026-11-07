import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/primitives";
import { AuthPage } from "@/components/AuthPage";

type Details = {
  client?: { name?: string; client_name?: string; redirect_uri?: string } | null;
  redirect_uri?: string;
  scope?: string;
  user?: { email?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: Details | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: "Je account herkennen",
  email: "Je e-mailadres delen",
  profile: "Je naam delen",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<Details | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Deze koppellink is ongeldig.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      setEmail(sess.session.user.email ?? "");
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error || !data) return setError("Deze koppeling is verlopen of ongeldig. Start opnieuw vanuit je assistent.");
        const immediate = data.redirect_url ?? data.redirect_to;
        if (immediate && !data.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch {
        if (active) setError("Koppelen lukt nu niet. Probeer het later opnieuw.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) throw new Error();
      window.location.href = target;
    } catch {
      setBusy(false);
      setError(approve ? "Koppelen is niet gelukt. Probeer opnieuw." : "Annuleren is niet gelukt. Probeer opnieuw.");
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "Deze app";
  const redirect = details?.client?.redirect_uri ?? details?.redirect_uri;
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <AuthPage>
      <div>
        {!details && !error && (
          <div className="flex items-center gap-2 py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Laden…</div>
        )}
        {error && !details && (<><PageHeader title="Koppelen" /><p role="alert" className="mt-3 text-base">{error}</p></>)}
        {details && (
          <>
            <PageHeader title={`Koppel ${clientName} aan Vakansie`} />
            <p className="mt-3 text-base">{clientName} kan dan je reizen, planning en kosten bekijken als jij. Wijzigen kan niet.</p>
            {email && <p className="mt-2 text-sm text-muted-foreground">Ingelogd als {email}</p>}
            {redirect && <p className="mt-1 break-all text-sm text-muted-foreground">Terug naar {redirect}</p>}
            {scopes.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {scopes.map((s) => <li key={s}>{SCOPE_LABELS[s] ?? `Extra toestemming: ${s}`}</li>)}
              </ul>
            )}
            <p className="mt-3 text-sm text-muted-foreground">Je ziet alleen reizen waar je zelf lid van bent.</p>
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
            <Button className="mt-5 h-14 w-full rounded-lg text-base" disabled={busy} onClick={() => decide(true)}>Koppelen</Button>
            <Button variant="secondary" className="mt-3 h-14 w-full rounded-lg bg-card text-base" disabled={busy} onClick={() => decide(false)}>Niet koppelen</Button>
          </>
        )}
      </div>
    </AuthPage>
  );
}
