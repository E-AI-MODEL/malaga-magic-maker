import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStartedRef = useRef(false);

  const handleVideoEnd = () => {
    setShowForm(true);
  };

  // Best-practice mobile autoplay strategy:
  // 1) attempt on load/canplay
  // 2) retry on first user gesture (without showing play button)
  const tryPlay = () => {
    const video = videoRef.current;
    if (!video || videoStartedRef.current) return;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          videoStartedRef.current = true;
        })
        .catch(() => {
          // Keep silent: we'll retry on user interaction automatically.
        });
    }
  };

  useEffect(() => {
    const onUserGesture = () => {
      tryPlay();
    };

    document.addEventListener("touchstart", onUserGesture, { passive: true });
    document.addEventListener("pointerdown", onUserGesture, { passive: true });
    document.addEventListener("keydown", onUserGesture);

    return () => {
      document.removeEventListener("touchstart", onUserGesture);
      document.removeEventListener("pointerdown", onUserGesture);
      document.removeEventListener("keydown", onUserGesture);
    };
  }, []);

  // Fallback: if video still didn't start after 4s, show form anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!videoStartedRef.current && !showForm) {
        setShowForm(true);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [showForm]);

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
    <div className="relative h-[100dvh] flex items-end justify-center overflow-hidden bg-black">
      {/* Video background — plays once, freezes on last frame */}
      <video
        ref={videoRef}
        src="/videos/boot-sequence.mp4"
        poster="/images/villa-mercedes-1.png"
        autoPlay
        muted
        playsInline
        preload="auto"
        // @ts-ignore — webkit prefix for older iOS
        webkit-playsinline="true"
        disablePictureInPicture
        onPlay={() => {
          videoStartedRef.current = true;
        }}
        onEnded={handleVideoEnd}
        onCanPlay={tryPlay}
        onCanPlayThrough={tryPlay}
        onLoadedData={tryPlay}
        className="absolute inset-0 w-full h-full object-contain sm:object-cover"
      />

      {/* Gradient overlay — always present for readability on mobile */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 sm:from-black/40 sm:via-transparent sm:to-transparent" />

      {/* Darken overlay — appears with form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
          />
        )}
      </AnimatePresence>

      {/* Login form — fades in from bottom after video ends */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="relative z-10 w-full max-w-xs mx-auto px-6 pb-10 sm:pb-16 flex flex-col items-center"
          >
            <form
              onSubmit={handleSubmit}
              className="w-full space-y-2.5"
            >
              {isRegister && (
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Je naam"
                  autoComplete="name"
                  className="h-11 bg-black/40 border-white/15 text-white placeholder:text-white/40 text-[16px] sm:text-sm rounded-xl backdrop-blur-md focus:bg-black/50 focus:border-white/30"
                />
              )}
              <Input
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder={isRegister ? "E-mailadres" : "E-mail of username"}
                autoComplete={isRegister ? "email" : "username"}
                className="h-11 bg-black/40 border-white/15 text-white placeholder:text-white/40 text-[16px] sm:text-sm rounded-xl backdrop-blur-md focus:bg-black/50 focus:border-white/30"
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Wachtwoord"
                autoComplete={isRegister ? "new-password" : "current-password"}
                className="h-11 bg-black/40 border-white/15 text-white placeholder:text-white/40 text-[16px] sm:text-sm rounded-xl backdrop-blur-md focus:bg-black/50 focus:border-white/30"
              />
              {error && <p className="text-xs text-red-400 font-medium pt-0.5">{error}</p>}
              {success && <p className="text-xs text-green-400 font-medium pt-0.5">{success}</p>}
              <Button
                type="submit"
                className="w-full h-11 font-bold text-sm rounded-xl"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button during video */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="absolute bottom-6 right-6 z-20 text-white/30 text-[11px] hover:text-white/60 transition-colors"
        >
          Overslaan
        </button>
      )}
    </div>
  );
}
