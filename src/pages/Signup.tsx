import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { PUBLIC_SIGNUP_ENABLED } from "@/config/access";
import logo from "@/assets/vakansie-logo.png";

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
  const enabled = PUBLIC_SIGNUP_ENABLED || inviteContinuation;

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
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-7 text-center shadow-soft">
          <h1 className="font-brand text-2xl font-semibold">Vakansie is nog privé</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Nieuwe accounts worden pas geopend wanneer de publieke versie klaar is.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to={`/login?next=${encodeURIComponent(next)}`}>Ik heb al toegang</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <img src={logo} alt="" width={32} height={32} className="h-8 w-8 rounded-[10px] object-cover" />
          <span className="font-brand text-xl font-semibold">Vakansie</span>
        </div>

        <div className="rounded-[24px] border border-border bg-card p-7 shadow-soft">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Account</p>
          <h1 className="mt-2 font-brand text-[28px] font-semibold leading-tight">Maak je account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Daarmee kun je je eigen reizen beheren en uitnodigingen accepteren.
          </p>

          <div className="mt-6">
            <GoogleAuthButton onClick={handleGoogle} loading={loading} label="Ga verder met Google" />
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">of met e-mail</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="text-sm font-semibold">
                Naam
              </label>
              <Input
                id="signup-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                className="mt-2 h-11"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="text-sm font-semibold">
                E-mailadres
              </label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-2 h-11"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="text-sm font-semibold">
                Wachtwoord
              </label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-2 h-11"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">Minimaal 8 tekens.</p>
            </div>
            <div>
              <label htmlFor="signup-confirm" className="text-sm font-semibold">
                Herhaal wachtwoord
              </label>
              <Input
                id="signup-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                className="mt-2 h-11"
              />
            </div>
            {error && (
              <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>
            )}
            {message && (
              <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">{message}</p>
            )}
            <Button type="submit" className="h-12 w-full rounded-full font-bold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Account maken
            </Button>
          </form>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Door een account aan te maken ga je akkoord met onze gebruiksvoorwaarden en privacyverklaring.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Al een account?{" "}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
