import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LogIn, MessageCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import knaakieIcon from "@/assets/icon-knaakie.png";
import vakansieIcon from "@/assets/icon-vakansie.png";

const pill = "flex min-h-[min(3.5rem,8dvh)] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-card/90 px-2 text-[15px] font-bold text-foreground shadow-sm active:translate-y-0.5";
const title = "block text-center font-display text-4xl font-bold leading-none text-on-image drop-shadow-sm sm:text-5xl";

export function ProductButtons({ knaakieTo, vakansieTo, onScan, onManual, scanUnavailable = false, compact = false }: { knaakieTo: string; vakansieTo: string; onScan?: () => void; onManual?: () => void; scanUnavailable?: boolean; compact?: boolean }) {
  const [hansieOpen, setHansieOpen] = useState(false);
  const publicHome = !!onScan;
  return (
    <>
    <nav aria-label="Knaakie en Vakansie" className={`space-y-[2dvh] pb-2 ${compact ? "max-sm:[&_img]:h-12 max-sm:[&_img]:w-12 max-sm:[&_span.font-display]:text-3xl max-sm:[&_a.mt-3]:min-h-11 max-sm:[&_a.mt-3]:mt-2" : ""}`}>
      <div className="grid grid-cols-2 gap-3">
        <div className="tile-knaakie flex min-w-0 flex-col rounded-[1.75rem] p-3 pb-4">
          {publicHome && !scanUnavailable && onManual && (
            <button type="button" aria-label="Vul zelf in" onClick={onManual} className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-full bg-card/25 text-on-image"><PenLine className="size-5" /></button>
          )}
          <Link to={knaakieTo} className="flex flex-1 flex-col items-center gap-1 rounded-2xl [@media(max-height:640px)]:pt-9">
            <img src={knaakieIcon} alt="" width={816} height={816} className="h-[min(6rem,11dvh)] w-[min(6rem,11dvh)] object-contain sm:h-28 sm:w-28 [@media(max-height:640px)]:hidden" />
            <span className={title}>Knaakie</span>
          </Link>
          {publicHome
            ? <button type="button" onClick={onScan} className={`${pill} mt-3`}>{scanUnavailable ? "Ga verder" : "Scan bon"}<ArrowRight className="size-5 shrink-0" /></button>
            : <Link to={knaakieTo} className={`${pill} mt-3`}>Scan bon<ArrowRight className="size-5 shrink-0" /></Link>}
        </div>
        <div className="tile-vakansie flex min-w-0 flex-col rounded-[1.75rem] p-3 pb-4">
          <Link to={vakansieTo} className="flex flex-1 flex-col items-center gap-1 rounded-2xl [@media(max-height:640px)]:pt-9">
            <img src={vakansieIcon} alt="" width={816} height={816} className="h-[min(6rem,11dvh)] w-[min(6rem,11dvh)] object-contain sm:h-28 sm:w-28 [@media(max-height:640px)]:hidden" />
            <span className={title}>Vakansie</span>
          </Link>
          <Link to={vakansieTo} aria-label="Direct regelen" className={`${pill} mt-3`}>Direct regelen<ArrowRight className="size-5 shrink-0" /></Link>
        </div>
      </div>
      {publicHome && (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/login" className="tile-plain flex min-h-[min(4rem,9dvh)] items-center justify-center gap-3 rounded-[1.5rem] text-lg font-bold text-foreground"><LogIn className="size-6" />Inloggen</Link>
          <button type="button" onClick={() => setHansieOpen(true)} className="tile-hansie flex min-h-[min(4rem,9dvh)] items-center justify-center gap-3 rounded-[1.5rem] text-lg font-bold text-foreground"><MessageCircle className="size-6" />Hansie</button>
        </div>
      )}
    </nav>
    <Sheet open={hansieOpen} onOpenChange={setHansieOpen}>
      <SheetContent side="bottom" className="mx-auto max-w-2xl rounded-t-2xl px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-8">
        <SheetHeader className="text-left">
          <MessageCircle aria-hidden className="mb-3 h-9 w-9 text-primary" />
          <SheetTitle className="font-display text-3xl">Hansie</SheetTitle>
          <SheetDescription className="text-base leading-relaxed">Vraag naar je planning, tickets of passende uitjes. Hansie gebruikt de gegevens van jouw reis.</SheetDescription>
        </SheetHeader>
        <Button asChild className="mt-6 min-h-14 w-full text-base"><Link to="/login"><LogIn />Log in voor je reis</Link></Button>
        <Button asChild variant="secondary" className="mt-3 min-h-12 w-full"><Link to="/signup">Maak een account</Link></Button>
      </SheetContent>
    </Sheet>
    </>
  );
}
