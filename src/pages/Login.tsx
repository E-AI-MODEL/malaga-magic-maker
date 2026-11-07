import { FormEvent, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { AuthPage } from "@/components/AuthPage";
import { loginDestination } from "@/features/trips/start";

export default function Login() {
  const { user, signIn, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const next = loginDestination(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    const result = await signInWithGoogle(next);
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
    <AuthPage>
        <div>
          <PageHeader title="Inloggen" />

          <div className="mt-3">
            <GoogleAuthButton onClick={handleGoogle} loading={loading} label="Inloggen met Google" />
          </div>

          <div className="my-3 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">of met e-mail</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <label htmlFor="login-email" className="sr-only">
                E-mailadres
              </label>
              <Input
                placeholder="E-mailadres"
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-12 text-base"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="sr-only">
                Wachtwoord
              </label>
              <Input
                placeholder="Wachtwoord"
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="h-12 text-base"
              />
            </div>
            {error && <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="h-14 w-full rounded-lg text-lg font-bold" disabled={loading}>
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

        <Button asChild variant="secondary" className="mt-6 h-14 w-full rounded-lg bg-card text-base"><Link to={`/signup?next=${encodeURIComponent(next)}`}>Account maken</Link></Button>
    </AuthPage>
  );
}
