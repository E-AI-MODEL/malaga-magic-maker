import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/primitives";
import { fetchPaymentHistory, formatAmount, verifyCheckoutSession, type PaymentRecord } from "./account";
import { paymentsConfigured } from "@/lib/stripe";

/** Payment history plus a recovery action for payments that never landed. */
export function PaymentHistory({ onRecovered }: { onRecovered?: () => void }) {
  const [items, setItems] = useState<PaymentRecord[] | null>(null);
  const [recovering, setRecovering] = useState(false);

  const load = useCallback(async () => {
    setItems(await fetchPaymentHistory());
  }, []);

  useEffect(() => {
    if (paymentsConfigured()) void load();
  }, [load]);

  if (!paymentsConfigured()) return null;

  const recover = async () => {
    const sessionId = window.prompt(
      "Plak de sessiecode uit je betaalbevestiging (begint met cs_). Die staat in de link waarop je na betalen terechtkwam.",
    );
    if (!sessionId) return;
    setRecovering(true);
    const result = await verifyCheckoutSession(sessionId.trim());
    setRecovering(false);
    if (result.granted) {
      toast.success("Betaling gevonden, Pro is geactiveerd");
      await load();
      onRecovered?.();
      return;
    }
    toast.error(
      result.reason === "pending"
        ? "Deze betaling is nog niet afgerond"
        : result.reason === "not_yours"
          ? "Deze betaling hoort niet bij dit account"
          : "We konden deze betaling niet vinden",
    );
  };

  return (
    <section className="mt-8">
      <SectionLabel>Betalingen</SectionLabel>
      {items && items.length > 0 ? (
        <div className="mt-1 rule-divide">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{formatAmount(item.amountCents, item.currency)}</span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(item.grantedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                  {item.environment === "sandbox" ? " · testbetaling" : ""}
                </span>
              </span>
              {item.receiptUrl && (
                <a
                  href={item.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary"
                >
                  Bon
                  <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="py-3 text-sm text-muted-foreground">Nog geen betalingen op dit account.</p>
      )}
      <Button variant="ghost" size="sm" className="-ml-3 mt-1" onClick={recover} disabled={recovering}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
        {recovering ? "Bezig…" : "Betaling niet zichtbaar?"}
      </Button>
    </section>
  );
}
