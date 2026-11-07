import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import heroHome from "@/assets/hero-home.jpg";

export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-[100dvh] overflow-hidden bg-foreground text-foreground">
      <img src={heroHome} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/10 to-foreground/40" />
      <div className="relative mx-auto flex h-full max-w-lg flex-col px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)]">
        <header className="flex h-12 shrink-0 items-center justify-between">
          <Link to="/" aria-label="Vakansie Home" className="py-2">
            <BrandLogo onImage />
          </Link>
          <Link to="/" className="tile-plain flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold"><Home className="size-5" />Home</Link>
        </header>
        <p className="mt-[1vh] shrink-0 text-center font-display text-[clamp(1.6rem,4vh,2.6rem)] font-bold leading-[1.05] text-on-image drop-shadow-md">Jouw hele vakantie in je broekzak</p>
        <main className="tile-plain mt-[2vh] min-h-0 flex-1 overflow-y-auto rounded-[1.75rem] bg-card p-4">{children}</main>
      </div>
    </div>
  );
}
