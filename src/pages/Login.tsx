import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const { signIn } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStartedRef = useRef(false);

  const handleVideoEnd = () => {
    setShowForm(true);
  };

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
          // Retry on the first user interaction.
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
    setLoading(true);

    const result = await signIn(emailOrUsername, password);
    if (result.error) setError(result.error);

    setLoading(false);
  };

  return (
    <div className="relative h-[100dvh] flex items-end justify-center overflow-hidden bg-black">
      <video
        ref={videoRef}
        src="/videos/boot-sequence.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 sm:from-black/40 sm:via-transparent sm:to-transparent" />

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

      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="relative z-10 w-full max-w-xs mx-auto px-6 pb-10 sm:pb-16 flex flex-col items-center"
          >
            <form onSubmit={handleSubmit} className="w-full space-y-2.5">
              <Input
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="Admin of e-mailadres"
                autoComplete="username"
                className="h-11 bg-black/40 border-white/15 text-white placeholder:text-white/40 text-[16px] sm:text-sm rounded-xl backdrop-blur-md focus:bg-black/50 focus:border-white/30"
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Wachtwoord"
                autoComplete="current-password"
                className="h-11 bg-black/40 border-white/15 text-white placeholder:text-white/40 text-[16px] sm:text-sm rounded-xl backdrop-blur-md focus:bg-black/50 focus:border-white/30"
              />
              {error && <p className="text-xs text-red-400 font-medium pt-0.5">{error}</p>}
              <Button
                type="submit"
                className="w-full h-11 font-bold text-sm rounded-xl"
                disabled={loading}
              >
                {loading ? "Even wachten..." : "Inloggen"}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

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
