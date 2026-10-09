import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/reminders-unsubscribe`;

// Opening this page changes nothing; only the button sends the signed token (POST).
export default function Afmelden() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"ask" | "busy" | "done" | "invalid" | "failed">(token ? "ask" : "invalid");

  const confirm = async () => {
    setState("busy");
    try {
      const res = await fetch(FUNCTION_URL, { method: "POST", body: new URLSearchParams({ token }) });
      setState(res.ok ? "done" : res.status === 400 ? "invalid" : "failed");
    } catch {
      setState("failed");
    }
  };

  const text = {
    ask: "Wil je geen herinneringen meer per e-mail?",
    busy: "Wil je geen herinneringen meer per e-mail?",
    done: "Je krijgt geen herinneringen meer per e-mail. Je kunt ze weer aanzetten in Profiel.",
    invalid: "Deze afmeldlink is ongeldig of verlopen. Je kunt herinneringen uitzetten in Profiel.",
    failed: "Afmelden lukt nu even niet. Probeer het later opnieuw.",
  }[state];

  return (
    <main className="mx-auto max-w-md px-6 py-[15vh]">
      <p className="text-[13px] font-bold uppercase tracking-[2px] text-primary">Vakansie</p>
      <p className="mt-4 text-lg leading-relaxed">{text}</p>
      {(state === "ask" || state === "busy") && (
        <Button className="mt-6" disabled={state === "busy"} onClick={() => void confirm()}>
          {state === "busy" ? "Bezig..." : "Ja, afmelden"}
        </Button>
      )}
      <p className="mt-6"><Link to="/profiel" className="text-sm underline underline-offset-4">Naar Profiel</Link></p>
    </main>
  );
}
