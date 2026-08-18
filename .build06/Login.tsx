import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { INVITE_SIGNUP_ENABLED, PUBLIC_SIGNUP_ENABLED } from "@/config/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/trips";
  return value;
}

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const inviteContinuation = next.startsWith("/join/");

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStartedRef = useRef(false);

  const tryPlay = () => {
    const video = videoRef.current;
    if (!video || videoStartedRef.current) return;
    const promise = video.play();
    if (promise && typeof promise.then === "function") {
      promise.then(() => {
        videoStartedRef.current = true;
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const onGesture = () => tryPlay();
    document.addEventListener("touchstart", onGesture, { passive: true });
    document.addEventListener("pointerdown", onGesture, { passive: true });
    document.addEventListener("keydown", onGesture);
    return () => {
      document.removeEventListener("touchstart", onGesture);
      document.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("keydown", onGesture);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!videoStartedRef.current && !showForm) setShowForm(true);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [showForm]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(emailOrUsername, password);
    if (result.error) setError(result.error);
    else navigate(next, { replace: true });
    setLoading(false);
  };

  const signupAvailable = PUBLIC_SIGNUP_ENABLED || (inviteContinuation && INVITE_SIGNUP_ENABLED);
  const signupHref = `/signup?next=${encodeURIComponent(next)}`;

  return (
    <div className="relative h-[100dvh] flex items-end justify-center overflow-hidden bg-black">
      <video
        ref={videoRef}
        src="/videos/boot-sequence.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onPlay={() => { videoStartedRef.current = true; }}
        onEnded={() => setShowForm(true)}
        onCanPlay={tryPlay}
        onCanPlayThrough={tryPlay}
        onLoadedData={tryPlay}
        className="absolute inset-0 h-full w-full object-contain sm:object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 sm:from-black/40 sm:via-transparent sm:to-transparent" />

      <AnimatePresence>
        {showForm && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="relative z-10 mx-auto flex w-full max-w-xs flex-col items-center px-6 pb-10 sm:pb-16"
          >
            {inviteContinuation && <p className="mb-3 text-center text-xs font-medium text-white/70">Log in om de uitnodiging te accepteren.</p>}
            <form onSubmit={handleSubmit} className="w-full space-y-2.5">
              <Input
                value={emailOrUsername}
                onChange={(event) => setEmailOrUsername(event.target.value)}
                placeholder="E-mailadres"
                autoComplete="username"
                className="h-11 rounded-xl border-white/15 bg-black/40 text-[16px] text-white placeholder:text-white/40 backdrop-blur-md focus:border-white/30 focus:bg-black/50 sm:text-sm"
              />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Wachtwoord"
                autoComplete="current-password"
                className="h-11 rounded-xl border-white/15 bg-black/40 text-[16px] text-white placeholder:text-white/40 backdrop-blur-md focus:border-white/30 focus:bg-black/50 sm:text-sm"
              />
              {error && <p className="pt-0.5 text-xs font-medium text-red-400">{error}</p>}
              <Button type="submit" className="h-11 w-full rounded-xl text-sm font-bold" disabled={loading}>
                {loading ? "Even wachten..." : "Inloggen"}
              </Button>
            </form>

            <div className="mt-3 flex w-full items-center justify-between text-xs text-white/60">
              <Link to="/forgot-password" className="hover:text-white">Wachtwoord vergeten?</Link>
              {signupAvailable && <Link to={signupHref} className="hover:text-white">Account maken</Link>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="absolute bottom-6 right-6 z-20 text-[11px] text-white/30 transition-colors hover:text-white/60">
          Overslaan
        </button>
      )}
    </div>
  );
}
