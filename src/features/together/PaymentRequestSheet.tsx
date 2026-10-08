import { useMemo } from "react";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/FormSheet";
import { buildPaymentRequestText } from "./payment-request";

type PaymentRequestSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName: string;
  tripName: string;
  amount: number;
  currency: string;
  iban?: string | null;
  accountName?: string | null;
};

/** Share a payment request for one open transfer with the person who owes it. */
export function PaymentRequestSheet({
  open,
  onOpenChange,
  recipientName,
  tripName,
  amount,
  currency,
  iban,
  accountName,
}: PaymentRequestSheetProps) {
  const text = useMemo(
    () => buildPaymentRequestText({ recipientName, tripName, amount, currency, iban, accountName }),
    [recipientName, tripName, amount, currency, iban, accountName],
  );
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  const handleShare = async () => {
    try {
      await navigator.share({ text });
    } catch {
      // User cancelled the share sheet; nothing to report.
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Gekopieerd");
    } catch {
      toast.error("Kopiëren lukte niet op dit apparaat.");
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Betaalverzoek"
      description={`Voor ${recipientName}`}
    >
      <p className="mt-1 whitespace-pre-wrap rounded-xl bg-secondary px-4 py-3 text-[15px] leading-relaxed">{text}</p>
      <div className="mt-5 space-y-2.5">
        {canShare && (
          <Button type="button" onClick={() => void handleShare()} className="h-12 w-full rounded-xl font-display text-base font-extrabold uppercase tracking-wide">
            <Share2 className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Delen
          </Button>
        )}
        <Button asChild variant="outline" className="h-12 w-full rounded-xl">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
            WhatsApp
          </a>
        </Button>
        <Button type="button" variant="outline" onClick={() => void handleCopy()} className="h-12 w-full rounded-xl">
          <Copy className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Kopiëren
        </Button>
      </div>
    </FormSheet>
  );
}
