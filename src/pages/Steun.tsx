import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/primitives";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { DonationCheckout } from "@/components/DonationCheckout";
import { paymentsConfigured } from "@/lib/stripe";
import { useAuth } from "@/lib/auth";

const AMOUNTS = [
  { cents: 200, label: "€ 2" },
  { cents: 500, label: "€ 5" },
  { cents: 1000, label: "€ 10" },
];

export default function Steun() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const completed = Boolean(searchParams.get("session_id"));
  const [amount, setAmount] = useState(200);
  const [checkingOut, setCheckingOut] = useState(false);
  const configured = paymentsConfigured();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <PaymentTestModeBanner />
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-5">
          <Button asChild variant="ghost" size="sm" className="-ml-3 rounded-full">
            <Link to="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Terug
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16">
        {completed ? (
          <section className="mt-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" strokeWidth={1.5} />
            <h1 className="mt-4 font-brand text-[28px] font-semibold leading-tight">Dankjewel</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Je bijdrage is verwerkt. Daar help je Vakansie enorm mee — en het blijft voor iedereen gratis.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to={user ? "/trips" : "/"}>Verder</Link>
            </Button>
          </section>
        ) : (
          <>
            <h1 className="mt-8 font-brand text-[30px] font-semibold leading-tight">Vakansie steunen</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Vakansie is en blijft gratis. Met een eenmalige bijdrage help je de kosten van hosting, veilige
              opslag van je documenten en Hansie dragen. Je krijgt er geen extra functies voor — het is puur een
              steuntje in de rug.
            </p>

            <Surface className="mt-6 p-5">
              <p className="font-display text-[13px] font-semibold">Kies een bedrag</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {AMOUNTS.map((option) => (
                  <button
                    key={option.cents}
                    type="button"
                    disabled={checkingOut}
                    onClick={() => setAmount(option.cents)}
                    className={`rounded-[12px] border px-3 py-3 font-brand text-[20px] font-semibold transition-colors ${
                      amount === option.cents
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {!configured ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  De betaalmodule wordt op dit moment ingericht. Probeer het straks nog eens.
                </p>
              ) : checkingOut ? (
                <DonationCheckout
                  amountInCents={amount}
                  customerEmail={user?.email ?? undefined}
                  returnUrl={`${window.location.origin}/steun?session_id={CHECKOUT_SESSION_ID}`}
                />
              ) : (
                <Button className="mt-5 w-full rounded-full" onClick={() => setCheckingOut(true)}>
                  <Heart className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                  Doorgaan naar betalen
                </Button>
              )}
            </Surface>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Eenmalige betaling, geen abonnement. Je kunt dit op elk moment overslaan; alle functies blijven
              gewoon beschikbaar.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
