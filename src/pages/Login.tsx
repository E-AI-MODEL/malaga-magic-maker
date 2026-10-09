import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import logo from "@/assets/vakansie_primary_complete.png.asset.json";
import { loginDestination } from "@/features/trips/start";

export default function Login() {
  const { user, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = loginDestination(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
    // Successful sign-in: the `user` redirect below navigates once; a second navigate here raced it and could leave "/" blank.
  };

  if (user) return <Navigate to={next} replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5">
          <img src={logo.url} alt="Vakansie" width={169} height={43} className="h-10 w-auto object-contain" />
        </div>

        <div className="rounded-lg border border-border bg-card p-7 shadow-soft">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Inloggen</p>
          <h1 className="mt-2 font-display uppercase text-[28px] font-semibold leading-tight">Welkom terug</h1>
          <p className="mt-2 text-sm text-muted-foreground">Log in om je reizen te bekijken en verder te werken.</p>

          <div className="mt-6">
            <GoogleAuthButton onClick={handleGoogle} loading={loading} label="Inloggen met Google" />
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">of met e-mail</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="text-sm font-semibold">
                E-mailadres
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-2 h-11"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="text-sm font-semibold">
                Wachtwoord
              </label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-2 h-11"
              />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="h-12 w-full rounded-md font-bold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Inloggen
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
              Wachtwoord vergeten?
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Nog geen account?{" "}
          <Link to={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
            Maak er een aan
          </Link>
        </p>
      </div>
    </div>
  );
}
