import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImg from "@/assets/hero-costa-del-sol.jpg";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isRegister) {
      if (!emailOrUsername.includes("@")) {
        setError("Voer een geldig e-mailadres in");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Wachtwoord moet minimaal 6 tekens zijn");
        setLoading(false);
        return;
      }
      if (!displayName.trim()) {
        setError("Vul je naam in");
        setLoading(false);
        return;
      }
      const result = await signUp(emailOrUsername, password, displayName.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Check je e-mail om je account te bevestigen!");
      }
    } else {
      const result = await signIn(emailOrUsername, password);
      if (result.error) setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-end sm:items-center justify-center">
      <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      <div className="relative z-10 w-full max-w-sm mx-auto px-6 pb-12 sm:pb-0">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-extrabold text-white tracking-tight leading-none">
            VAKANSIE
          </h1>
          <p className="text-white/70 text-sm mt-3 font-medium">
            {isRegister ? "Maak een account aan" : "Plan je vakansie met Hansie, wel zo makkelijk."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Je naam"
              autoComplete="name"
              className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm focus:bg-white/15"
            />
          )}
          <Input
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder={isRegister ? "E-mailadres" : "E-mail of username"}
            autoComplete={isRegister ? "email" : "username"}
            className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm focus:bg-white/15"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm focus:bg-white/15"
          />
          {error && <p className="text-sm text-red-400 font-medium">{error}</p>}
          {success && <p className="text-sm text-green-400 font-medium">{success}</p>}
          <Button type="submit" className="w-full h-12 font-bold text-base" disabled={loading}>
            {loading ? "Even wachten..." : isRegister ? "Registreren" : "Inloggen"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setIsRegister(!isRegister); setError(""); setSuccess(""); }}
          className="w-full text-center text-white/60 text-sm mt-4 hover:text-white/80 transition-colors"
        >
          {isRegister ? "Al een account? Inloggen" : "Nog geen account? Registreren"}
        </button>
      </div>
    </div>
  );
}
