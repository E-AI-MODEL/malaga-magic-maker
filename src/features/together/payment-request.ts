import { formatIban } from "./iban";

type PaymentRequestInput = {
  recipientName: string;
  tripName: string;
  amount: number;
  currency: string;
  iban?: string | null;
  accountName?: string | null;
};

/**
 * Pure builder for the payment request message. No ids, e-mail addresses or
 * document data ever go in here — only names, trip name and the amount.
 */
export function buildPaymentRequestText({
  recipientName,
  tripName,
  amount,
  currency,
  iban,
  accountName,
}: PaymentRequestInput): string {
  const formatted = new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(amount);
  const ibanLine = iban && accountName ? ` Je kunt het overmaken naar ${formatIban(iban)} t.n.v. ${accountName}.` : "";
  return `Hoi ${recipientName}, voor ${tripName} krijg ik nog ${formatted} van je (jouw deel van de gedeelde kosten).${ibanLine}`;
}
