import { Link } from "react-router-dom";
import { ArrowUpRight, Luggage, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductButtons({ knaakieTo, vakansieTo }: { knaakieTo: string; vakansieTo: string }) {
  return (
    <nav aria-label="Knaakie en Vakansie" className="grid grid-cols-2 gap-3 pb-1">
      <Button asChild variant="secondary" className="h-36 min-w-0 flex-col items-start justify-between rounded-lg bg-card p-4 text-foreground hover:bg-accent sm:h-40 sm:p-5">
        <Link to={knaakieTo}>
          <span aria-hidden className="flex w-full items-center justify-between"><ReceiptText className="!size-7" /><ArrowUpRight className="!size-5" /></span>
          <span className="text-left"><span className="block font-display text-3xl font-bold">Knaakie</span><span className="mt-1 block text-sm font-medium">Scan en deel kosten</span></span>
        </Link>
      </Button>
      <Button asChild variant="secondary" className="h-36 min-w-0 flex-col items-start justify-between rounded-lg bg-card p-4 text-foreground hover:bg-accent sm:h-40 sm:p-5">
        <Link to={vakansieTo}>
          <span aria-hidden className="flex w-full items-center justify-between"><Luggage className="!size-7" /><ArrowUpRight className="!size-5" /></span>
          <span className="text-left"><span className="block font-display text-3xl font-bold">Vakansie</span><span className="mt-1 block text-sm font-medium">Plan je vakantie</span></span>
        </Link>
      </Button>
    </nav>
  );
}