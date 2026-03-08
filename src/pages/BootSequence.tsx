import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function BootSequence() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const finish = () => {
    sessionStorage.setItem("boot-shown", "1");
    navigate("/taken", { replace: true });
  };

  useEffect(() => {
    // If already seen this session, skip
    if (sessionStorage.getItem("boot-shown")) {
      navigate("/taken", { replace: true });
    }
  }, [navigate]);

  if (sessionStorage.getItem("boot-shown")) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src="/videos/boot-sequence.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        className="w-full h-full object-contain"
      />
      {/* Subtitle overlay */}
      <div className="absolute bottom-16 sm:bottom-24 left-0 right-0 text-center pointer-events-none">
        <p className="text-white/80 text-sm sm:text-base font-medium tracking-wide drop-shadow-lg">
          Plan je vakantie met Hansie… wel zo makkelijk.
        </p>
      </div>
      <button
        onClick={finish}
        className="absolute bottom-6 right-6 text-white/30 text-[11px] hover:text-white/60 transition-colors"
      >
        Overslaan
      </button>
    </div>
  );
}
