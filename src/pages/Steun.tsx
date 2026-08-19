import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/primitives";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { ProCheckout } from "@/features/pro/ProCheckout";
import { PRO_BENEFITS, PRO_PLANS } from "@/features/pro/plans";
import { usePro } from "@/features/pro/usePro";
import { verifyCheckoutSession } from "@/features/pro/account";
import { paymentsConfigured } from "@/lib/stripe";
import { useAuth } from "@/lib/auth";

export default function Steun() {
  const { user } = useAuth();
  const { isPro, refresh: refreshPro } = usePro();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const completed = Boolean(sessionId);
  const [priceId, setPriceId] = useState<string>(PRO_PLANS[0].priceId);
  const [checkingOut, setCheckingOut] = useState(false);
  const [verifyState, setVerifyState] = useState<"idle" | "busy" | "granted" | "pending" | "failed">("idle");
  const configured = paymentsConfigured();

  // The webhook normally grants Pro; this is the fallback when it is late or missed.
  useEffect(() => {
    if (!sessionId || !user || !configured) return;
    let cancelled = false;
    setVerifyState("busy");
    void (async () => {
      const result = await verifyCheckoutSession(sessionId);
      if (cancelled) return;
      if (result.granted) {
        setVerifyState("granted");
        void refreshPro();
      } else {
        setVerifyState(result.reason === "pending" ? "pending" : "failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, user, configured, refreshPro]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <PaymentTestModeBanner />
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-5">
          <Button asChild variant="ghost" size="sm" className="-ml-3 rounded-full">
            <Link to={user ? "/trips" : "/"}>
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
              {!user
                ? "Je bijdrage is ontvangen. Bedankt — dit was een donatie zonder account, dus er wordt geen Pro geactiveerd."
                : verifyState === "granted"
                  ? "Je betaling is ontvangen en Vakansie Pro staat nu op je account."
                  : verifyState === "pending"
                    ? "Je betaling wordt nog verwerkt. Zodra die rond is, staat Pro automatisch op je account."
                    : verifyState === "failed"
                      ? "We konden je betaling nog niet koppelen. Probeer het via Profiel › Betalingen opnieuw te controleren."
                      : "Je betaling is ontvangen. We koppelen Pro nu aan je account."}
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to={user ? "/trips" : "/"}>Verder</Link>
            </Button>
          </section>
        ) : isPro ? (
          <section className="mt-10 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" strokeWidth={1.5} />
            <h1 className="mt-4 font-brand text-[28px] font-semibold leading-tight">Je hebt Vakansie Pro</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Bedankt voor je bijdrage. Pro staat blijvend op je account, er loopt geen abonnement.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/trips">Naar mijn reizen</Link>
            </Button>
          </section>
        ) : (
          <>
            <h1 className="mt-8 font-brand text-[30px] font-semibold leading-tight">Vakansie Pro</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Vakansie is en blijft gratis te gebruiken. Met een eenmalige bijdrage ontgrendel je Pro op je
              account en help je de kosten van hosting, veilige documentopslag en Hansie dragen. Geen
              abonnement, geen verlenging.
            </p>

            <Surface className="mt-6 p-5">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {PRO_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 font-display text-[13px] font-semibold">Kies je bijdrage</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {PRO_PLANS.map((plan) => (
                  <button
                    key={plan.priceId}
                    type="button"
                    disabled={checkingOut}
                    onClick={() => setPriceId(plan.priceId)}
                    className={`rounded-[12px] border px-3 py-3 font-brand text-[20px] font-semibold transition-colors ${
                      priceId === plan.priceId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {plan.label}
                  </button>
                ))}
              </div>

              {!configured ? (
                <p className="mt-5 text-sm text-muted-foreground">
                  De betaalmodule wordt op dit moment ingericht. Probeer het straks nog eens.
                </p>
              ) : checkingOut ? (
                <ProCheckout
                  priceId={priceId}
                  returnUrl={`${window.location.origin}/steun?session_id={CHECKOUT_SESSION_ID}`}
                />
              ) : (
                <>
                  <Button className="mt-5 w-full rounded-full" onClick={() => setCheckingOut(true)}>
                    <Heart className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                    {user ? "Doorgaan naar betalen" : "Doneren zonder account"}
                  </Button>
                  {!user && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Zonder ingelogd account is dit een donatie: er wordt geen Pro geactiveerd.{" "}
                      <Link to="/login" className="underline">
                        Log in
                      </Link>{" "}
                      als je Pro wilt ontgrendelen.
                    </p>
                  )}
                </>
              )}
            </Surface>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Eenmalige betaling, geen abonnement en geen automatische verlenging. Je kunt dit overslaan; alle
              basisfuncties blijven gewoon beschikbaar.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
