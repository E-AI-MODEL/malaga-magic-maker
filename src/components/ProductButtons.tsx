import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Camera, LogIn, Luggage, MessageCircle, PenLine, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function ProductButtons({ knaakieTo, vakansieTo, onScan, onManual, scanUnavailable = false }: { knaakieTo: string; vakansieTo: string; onScan?: () => void; onManual?: () => void; scanUnavailable?: boolean }) {
  const [hansieOpen, setHansieOpen] = useState(false);
  return (
    <>
    <nav aria-label="Knaakie en Vakansie" className="grid grid-cols-2 gap-3 pb-1">
      <div className={onScan ? "button-physical flex min-h-56 min-w-0 flex-col rounded-lg bg-card p-3 text-foreground sm:p-5" : "contents"}>
      <Button asChild variant={onScan ? "ghost" : "secondary"} className={onScan ? "min-h-28 w-full flex-1 flex-col items-start justify-between px-1 py-2 text-foreground" : "h-36 min-w-0 flex-col items-start justify-between rounded-lg bg-card p-4 text-foreground hover:bg-accent sm:h-40 sm:p-5"}>
        <Link to={knaakieTo}>
          <span aria-hidden className="flex w-full items-center justify-between"><ReceiptText className="!size-7" /><ArrowUpRight className="!size-5" /></span>
          <span className="text-left"><span className="block font-display text-3xl font-bold">Knaakie</span></span>
        </Link>
      </Button>
      {onScan && <div className="mt-3">
        <div className="flex gap-2">
          <Button onClick={onScan} className="min-h-14 min-w-0 flex-1 flex-col gap-1 whitespace-nowrap rounded-md px-2 text-sm"><Camera />{scanUnavailable ? "Ga verder" : "Scan bon"}</Button>
          {!scanUnavailable && onManual && <Button variant="secondary" size="icon" aria-label="Vul zelf in" title="Vul zelf in" onClick={onManual}><PenLine /></Button>}
        </div>
      </div>}
      </div>
      <div className={onScan ? "button-physical flex min-h-56 min-w-0 flex-col rounded-lg bg-card p-3 text-foreground sm:p-5" : "contents"}>
      <Button asChild variant={onScan ? "ghost" : "secondary"} className={onScan ? "min-h-28 w-full flex-1 flex-col items-start justify-between px-1 py-2 text-foreground" : "h-36 min-w-0 flex-col items-start justify-between rounded-lg bg-card p-4 text-foreground hover:bg-accent sm:h-40 sm:p-5"}>
        <Link to={vakansieTo}>
          <span aria-hidden className="flex w-full items-center justify-between"><Luggage className="!size-7" /><ArrowUpRight className="!size-5" /></span>
          <span className="text-left"><span className="block font-display text-3xl font-bold">Vakansie</span></span>
        </Link>
      </Button>
      {onScan && <div className="mt-3">
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="secondary" className="min-h-14 min-w-0 flex-col gap-1 rounded-md px-1 text-sm"><Link to="/login"><LogIn />Inloggen</Link></Button>
          <Button variant="secondary" className="min-h-14 min-w-0 flex-col gap-1 rounded-md px-1 text-sm" onClick={() => setHansieOpen(true)}><MessageCircle />Hansie</Button>
        </div>
      </div>}
      </div>
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