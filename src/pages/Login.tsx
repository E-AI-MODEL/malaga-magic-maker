import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/vakansie-logo.png";

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
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video background — same as boot sequence for seamless transition */}
      <video
        src="/videos/boot-sequence.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-xs mx-auto px-6 flex flex-col items-center">
        {/* Logo + title */}
        <img
          src={logo}
          alt="Vakansie"
          className="h-20 w-20 mb-4 drop-shadow-2xl rounded-2xl"
        />
        <h1 className="font-display text-3xl font-extrabold text-white tracking-tight leading-none mb-1">
          VAKANSIE
        </h1>
        <p className="text-white/50 text-xs mb-8 font-medium">
          {isRegister ? "Maak een account aan" : "Plan je vakantie met Hansie…"}
        </p>

        {/* Form card — subtle glass */}
        <form
          onSubmit={handleSubmit}
          className="w-full space-y-2.5 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/10 p-5"
        >
          {isRegister && (
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Je naam"
              autoComplete="name"
              className="h-11 bg-white/8 border-white/10 text-white placeholder:text-white/30 text-sm rounded-xl focus:bg-white/12 focus:border-white/20"
            />
          )}
          <Input
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            placeholder={isRegister ? "E-mailadres" : "E-mail of username"}
            autoComplete={isRegister ? "email" : "username"}
            className="h-11 bg-white/8 border-white/10 text-white placeholder:text-white/30 text-sm rounded-xl focus:bg-white/12 focus:border-white/20"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="h-11 bg-white/8 border-white/10 text-white placeholder:text-white/30 text-sm rounded-xl focus:bg-white/12 focus:border-white/20"
          />
          {error && <p className="text-xs text-red-400 font-medium pt-0.5">{error}</p>}
          {success && <p className="text-xs text-green-400 font-medium pt-0.5">{success}</p>}
          <Button
            type="submit"
            className="w-full h-11 font-bold text-sm rounded-xl mt-1"
            disabled={loading}
          >
            {loading ? "Even wachten..." : isRegister ? "Registreren" : "Inloggen"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setIsRegister(!isRegister); setError(""); setSuccess(""); }}
          className="text-white/40 text-xs mt-4 hover:text-white/60 transition-colors"
        >
          {isRegister ? "Al een account? Inloggen" : "Nog geen account? Registreren"}
        </button>
      </div>
    </div>
  );
}
