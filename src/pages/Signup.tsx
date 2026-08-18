import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { INVITE_SIGNUP_ENABLED, PUBLIC_SIGNUP_ENABLED } from "@/config/access";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/trips";
  return value;
}

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const inviteContinuation = next.startsWith("/join/");
  const enabled = PUBLIC_SIGNUP_ENABLED || (inviteContinuation && INVITE_SIGNUP_ENABLED);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!enabled) {
      setError("Nieuwe accounts zijn nog niet geopend.");
      return;
    }
    if (!displayName.trim() || !email.trim()) {
      setError("Vul je naam en e-mailadres in.");
      return;
    }
    if (password.length < 8) {
      setError("Gebruik een wachtwoord van minimaal 8 tekens.");
      return;
    }
    if (password !== confirmPassword) {
      setError("De wachtwoorden zijn niet hetzelfde.");
      return;
    }

    setLoading(true);
    const result = await signUp(email, password, displayName);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setMessage("Controleer je e-mail om je account te bevestigen. Open daarna deze uitnodiging opnieuw of log in.");
      return;
    }
    navigate(next, { replace: true });
  };

  if (!enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
          <h1 className="font-display text-2xl font-extrabold">Vakansie is nog privé</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Nieuwe accounts worden pas geopend wanneer de publieke versie klaar is.</p>
          <Button asChild className="mt-6"><Link to={`/login?next=${encodeURIComponent(next)}`}>Ik heb al toegang</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Account</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Maak je account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Daarmee kun je je eigen reizen beheren en uitnodigingen accepteren.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="signup-name" className="text-sm font-semibold">Naam</label>
            <Input id="signup-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="mt-2 h-11" />
          </div>
          <div>
            <label htmlFor="signup-email" className="text-sm font-semibold">E-mailadres</label>
            <Input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 h-11" />
          </div>
          <div>
            <label htmlFor="signup-password" className="text-sm font-semibold">Wachtwoord</label>
            <Input id="signup-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-2 h-11" />
          </div>
          <div>
            <label htmlFor="signup-confirm" className="text-sm font-semibold">Herhaal wachtwoord</label>
            <Input id="signup-confirm" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="mt-2 h-11" />
          </div>
          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
          {message && <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">{message}</p>}
          <Button type="submit" className="h-12 w-full font-bold" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Account maken
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">Al een account? <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">Log in</Link></p>
      </div>
    </div>
  );
}
