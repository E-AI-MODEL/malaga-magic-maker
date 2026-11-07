import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/vakansie_primary_complete.png.asset.json";
import heroHome from "@/assets/hero-home.jpg";

export function AuthPage({ children }: { children: ReactNode }) {
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-lg items-center justify-between px-5">
        <Link to="/" aria-label="Vakansie Home" className="py-2">
          {logoFailed ? <span className="font-display text-3xl font-bold">Vakansie</span> : <img src={logo.url} alt="Vakansie" width={169} height={43} onError={() => setLogoFailed(true)} className="h-8 w-auto object-contain" />}
        </Link>
      </header>
      <div className="relative">
        <img src={heroHome} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-foreground/60" />
        <div className="relative mx-auto flex max-w-lg items-center gap-5 px-5 py-6">
          <p className="flex-1 font-display text-2xl font-bold leading-tight text-on-image">Jouw hele vakantie in je broekzak</p>
          <Button asChild variant="secondary" className="h-24 w-28 shrink-0 flex-col gap-2 rounded-lg bg-card px-3 text-foreground hover:bg-accent">
            <Link to="/"><span aria-hidden className="flex w-full justify-between"><Home className="!size-6" /><ArrowUpLeft /></span><span className="w-full text-left text-base">Home</span></Link>
          </Button>
        </div>
      </div>
      <main className="mx-auto max-w-lg px-5 pb-[max(env(safe-area-inset-bottom),2rem)] pt-7">{children}</main>
    </div>
  );
}