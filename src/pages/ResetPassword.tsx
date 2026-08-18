import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function ResetPassword() {
  const { user, loading: authLoading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Gebruik een wachtwoord van minimaal 8 tekens.");
      return;
    }
    if (password !== confirmPassword) {
      setError("De wachtwoorden zijn niet hetzelfde.");
      return;
    }

    setSaving(true);
    const result = await updatePassword(password);
    setSaving(false);
    if (result.error) setError(result.error);
    else navigate("/trips", { replace: true });
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-sm">
          <h1 className="font-display text-2xl font-extrabold">Herstellink nodig</h1>
          <p className="mt-3 text-sm text-muted-foreground">Open de link uit je herstelmail. Is die verlopen, vraag dan een nieuwe aan.</p>
          <Button asChild className="mt-6"><Link to="/forgot-password">Nieuwe link aanvragen</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-sm">
        <h1 className="font-display text-2xl font-extrabold">Nieuw wachtwoord</h1>
        <p className="mt-2 text-sm text-muted-foreground">Kies een nieuw wachtwoord voor je account.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="text-sm font-semibold">Nieuw wachtwoord</label>
            <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="mt-2 h-11" />
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="text-sm font-semibold">Herhaal wachtwoord</label>
            <Input id="confirm-new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" className="mt-2 h-11" />
          </div>
          {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full font-bold" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Wachtwoord opslaan
          </Button>
        </form>
      </div>
    </div>
  );
}
