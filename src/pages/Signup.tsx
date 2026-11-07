import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { PUBLIC_SIGNUP_ENABLED } from "@/config/access";
import { usePlatformSwitches } from "@/features/ops/settings";
import { AuthPage } from "@/components/AuthPage";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/trips";
  return value;
}

export default function Signup() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const inviteContinuation = next.startsWith("/join/");
  const { signupsOpen } = usePlatformSwitches();
  const enabled = (PUBLIC_SIGNUP_ENABLED && signupsOpen) || inviteContinuation;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.error) setError(result.error);
  };

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
      setMessage("Controleer je e-mail om je account te bevestigen.");
      return;
    }
    navigate(next, { replace: true });
  };

  if (!enabled) {
    return (
      <AuthPage>
        <div>
          <PageHeader title="Vakansie is nog privé" />
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Nieuwe accounts worden pas geopend wanneer de publieke versie klaar is.
          </p>
          <Button asChild className="mt-6 rounded-md">
            <Link to={`/login?next=${encodeURIComponent(next)}`}>Ik heb al toegang</Link>
          </Button>
        </div>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
        <div>
          <PageHeader title="Account maken" />

          <div className="mt-3">
            <GoogleAuthButton onClick={handleGoogle} loading={loading} label="Ga verder met Google" />
          </div>

          <div className="my-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">of met e-mail</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label htmlFor="signup-name" className="sr-only">
                Naam
              </label>
              <Input
                placeholder="Naam"
                id="signup-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                className="h-12 text-base"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="sr-only">
                E-mailadres
              </label>
              <Input
                placeholder="E-mailadres"
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-12 text-base"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="sr-only">
                Wachtwoord
              </label>
              <Input
                placeholder="Wachtwoord"
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="h-12 text-base"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">Minimaal 8 tekens.</p>
            </div>
            <div>
              <label htmlFor="signup-confirm" className="sr-only">
                Herhaal wachtwoord
              </label>
              <Input
                placeholder="Herhaal wachtwoord"
                id="signup-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="h-12 text-base"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>
            )}
            {message && (
              <p className="rounded-lg bg-primary/10 px-4 py-3 text-sm font-medium text-primary">{message}</p>
            )}
            <Button type="submit" className="h-14 w-full rounded-lg text-lg font-bold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Account maken
            </Button>
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Door een account te maken ga je akkoord met de <Link to="/terms" className="underline">voorwaarden</Link> en <Link to="/privacy" className="underline">privacyverklaring</Link>.
          </p>
        </div>

        <Button asChild variant="secondary" className="mt-6 h-14 w-full rounded-lg bg-card text-base"><Link to={`/login?next=${encodeURIComponent(next)}`}>Inloggen</Link></Button>
    </AuthPage>
  );
}
