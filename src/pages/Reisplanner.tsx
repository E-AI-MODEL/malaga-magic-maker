import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2, UtensilsCrossed, Map, Flag, Moon, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import vakansielogo from "@/assets/vakansie-logo.png";

type Msg = { role: "user" | "assistant"; content: string };

const CHIPS = [
  { label: "Restaurant tips", icon: UtensilsCrossed, prompt: "Geef me 3-5 goede restauranttips in de buurt van onze accommodatie, passend bij ons groepsprofiel." },
  { label: "Dagtripjes", icon: Map, prompt: "Wat zijn leuke dagtripjes vanuit onze locatie voor onze groep?" },
  { label: "Golfbanen", icon: Flag, prompt: "Welke golfbanen in de buurt zijn het beste voor onze groep qua prijs en kwaliteit?" },
  { label: "Avondprogramma", icon: Moon, prompt: "Wat kunnen we 's avonds doen in de buurt? Denk aan bars, livemuziek, etc." },
  { label: "Boodschappen", icon: ShoppingCart, prompt: "Waar kunnen we het beste boodschappen doen en wat moeten we zeker kopen voor de groep?" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-ai-chat`;

async function streamChat({
  messages,
  tripId,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  tripId: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, tripId }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    onError(body.error || "Er ging iets mis met de AI.");
    return;
  }

  if (!resp.body) {
    onError("Geen response ontvangen.");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

export default function Reisplanner() {
  const { activeTrip } = useTrip();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || !activeTrip || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        tripId: activeTrip.id,
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (msg) => {
          toast.error(msg);
          setIsLoading(false);
        },
      });
    } catch {
      toast.error("Verbinding mislukt, probeer opnieuw.");
      setIsLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)]">
        {/* Hero header */}
        <div className="bg-foreground px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40 mb-1">Reisplanner</p>
          <h1 className="font-display text-xl font-extrabold text-white">AI Assistent</h1>
          <p className="text-xs text-white/50 mt-0.5">Kent jullie groepsvoorkeuren en geeft concrete tips</p>
        </div>

        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
              <img src={vakansielogo} alt="Vakansie" className="h-12 w-auto opacity-80" />
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Stel een vraag of kies een onderwerp om te beginnen.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Chips when chat is active */}
        {!isEmpty && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
            {CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => send(chip.prompt)}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-secondary transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <chip.icon className="h-3 w-3 text-primary" />
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border bg-background px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 max-w-2xl mx-auto"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Stel een vraag over jullie reis..."
              disabled={isLoading}
              className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
              style={{ fontSize: 16 }}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="rounded-xl h-10 w-10 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
