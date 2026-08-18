import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.error) setError(result.error);
    else setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm">
        <h1 className="font-display text-2xl font-extrabold">Wachtwoord herstellen</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Vul je e-mailadres in. Als daar een account bij hoort, ontvang je een herstellink.</p>

        {sent ? (
          <div className="mt-6">
            <p className="rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">Controleer je e-mail voor de herstellink.</p>
            <Button asChild variant="outline" className="mt-4 w-full"><Link to="/login">Terug naar inloggen</Link></Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="recovery-email" className="text-sm font-semibold">E-mailadres</label>
              <Input id="recovery-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 h-11" required />
            </div>
            {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="h-12 w-full font-bold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verstuur herstellink
            </Button>
            <Button asChild type="button" variant="ghost" className="w-full"><Link to="/login">Annuleren</Link></Button>
          </form>
        )}
      </div>
    </div>
  );
}
