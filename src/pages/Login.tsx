import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImg from "@/assets/hero-costa-del-sol.jpg";

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(username, password);
    if (result.error) setError(result.error);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-end sm:items-center justify-center">
      {/* Full-bleed background */}
      <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      <div className="relative z-10 w-full max-w-sm mx-auto px-6 pb-12 sm:pb-0">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-extrabold text-white tracking-tight leading-none">
            MALAGA
          </h1>
          <p className="text-white/70 text-sm mt-3 font-medium">2 – 5 april 2026 &middot; Costa del Sol</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm focus:bg-white/15"
          />
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            autoComplete="current-password"
            className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 backdrop-blur-sm focus:bg-white/15"
          />
          {error && <p className="text-sm text-red-400 font-medium">{error}</p>}
          <Button type="submit" className="w-full h-12 font-bold text-base" disabled={loading}>
            {loading ? "Even wachten..." : "Inloggen"}
          </Button>
        </form>

        <p className="text-white/40 text-xs text-center mt-6">6 man &middot; golf &middot; zon &middot; keuze maken</p>
      </div>
    </div>
  );
}
