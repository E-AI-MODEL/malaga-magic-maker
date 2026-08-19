const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Betalingen zijn nog niet live geconfigureerd.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-foreground">
        Alle betalingen in de preview zijn testbetalingen.
      </div>
    );
  }
  return null;
}
