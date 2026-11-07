import { Link } from "react-router-dom";
import { ArrowUpRight, Camera, Luggage, PenLine, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductButtons({ knaakieTo, vakansieTo, onScan, onManual, scanUnavailable = false }: { knaakieTo: string; vakansieTo: string; onScan?: () => void; onManual?: () => void; scanUnavailable?: boolean }) {
  return (
    <nav aria-label="Knaakie en Vakansie" className="grid grid-cols-2 gap-3 pb-1">
      <div className={onScan ? "button-physical flex min-h-56 min-w-0 flex-col rounded-lg bg-card p-3 text-foreground sm:p-5" : "contents"}>
      <Button asChild variant={onScan ? "ghost" : "secondary"} className={onScan ? "min-h-28 w-full flex-1 flex-col items-start justify-between px-1 py-2 text-foreground" : "h-36 min-w-0 flex-col items-start justify-between rounded-lg bg-card p-4 text-foreground hover:bg-accent sm:h-40 sm:p-5"}>
        <Link to={knaakieTo}>
          <span aria-hidden className="flex w-full items-center justify-between"><ReceiptText className="!size-7" /><ArrowUpRight className="!size-5" /></span>
          <span className="text-left"><span className="block font-display text-3xl font-bold">Knaakie</span><span className="mt-1 block text-sm font-medium">Scan en deel kosten</span></span>
        </Link>
      </Button>
      {onScan && <div className="mt-3">
        <div className="flex gap-2">
          <Button onClick={onScan} className="min-h-14 min-w-0 flex-1 flex-col gap-1 whitespace-nowrap rounded-md px-2 text-sm"><Camera />{scanUnavailable ? "Ga verder" : "Scan bon"}</Button>
          {!scanUnavailable && onManual && <Button variant="secondary" size="icon" aria-label="Vul zelf in" title="Vul zelf in" onClick={onManual}><PenLine /></Button>}
        </div>
        <p className="mt-3 text-xs font-medium text-muted-foreground">10 uitgaven gratis. Zonder account.</p>
      </div>}
      </div>
      <Button asChild variant="secondary" className={`${onScan ? "h-full min-h-56 justify-start gap-5" : "h-36 justify-between sm:h-40"} min-w-0 flex-col items-start rounded-lg bg-card p-4 text-foreground hover:bg-accent sm:p-5`}>
        <Link to={vakansieTo}>
          <span aria-hidden className="flex w-full items-center justify-between"><Luggage className="!size-7" /><ArrowUpRight className="!size-5" /></span>
          <span className="text-left"><span className="block font-display text-3xl font-bold">Vakansie</span><span className="mt-1 block text-sm font-medium">Plan je vakantie</span></span>
        </Link>
      </Button>
    </nav>
  );
}