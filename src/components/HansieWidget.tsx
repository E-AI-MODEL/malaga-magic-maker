import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, ChevronDown, Loader2, Send, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-ai-chat`;

async function streamHansie({
  tripId,
  messages,
  onDelta,
}: {
  tripId: string;
  messages: ChatMessage[];
  onDelta: (text: string) => void;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) throw new Error("Je bent niet ingelogd.");

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages, tripId, disabledContexts: [] }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Hansie kon je vraag niet beantwoorden.");
  }

  if (!response.body) throw new Error("Geen antwoord ontvangen.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (delta) onDelta(delta);
      } catch {
        // Ignore incomplete/non-chat SSE lines. The next complete line continues the stream.
      }
    }
  }
}

export function HansieWidget() {
  const { user } = useAuth();
  const { activeTrip, userTrips } = useTrip();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTripRoute = location.pathname.startsWith("/trip/");
  const isOpsRoute = location.pathname.startsWith("/ops");

  const availableTrips = useMemo(
    () => [...userTrips].sort((a, b) => {
      const aArchived = a.status === "archived" ? 1 : 0;
      const bArchived = b.status === "archived" ? 1 : 0;
      if (aArchived !== bArchived) return aArchived - bArchived;
      return a.name.localeCompare(b.name);
    }),
    [userTrips],
  );

  const [selectedTripId, setSelectedTripId] = useState("");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isTripRoute && activeTrip?.id) {
      setSelectedTripId(activeTrip.id);
      return;
    }

    const currentStillAvailable = availableTrips.some((trip) => trip.id === selectedTripId);
    if (!currentStillAvailable) {
      setSelectedTripId(activeTrip?.id && availableTrips.some((trip) => trip.id === activeTrip.id)
        ? activeTrip.id
        : availableTrips[0]?.id || "");
    }
  }, [activeTrip?.id, availableTrips, isTripRoute, selectedTripId]);

  const contextTrip = isTripRoute && activeTrip
    ? activeTrip
    : availableTrips.find((trip) => trip.id === selectedTripId) || availableTrips[0];

  useEffect(() => {
    setMessages([]);
    setInput("");
    setLoading(false);
  }, [contextTrip?.id]);

  const suggestions = useMemo(
    () => [
      "Wat staat er al vast voor deze reis?",
      "Wat moet ik nu nog regelen?",
      "Welke open punten verdienen eerst aandacht?",
    ],
    [],
  );

  if (!user || isOpsRoute || !contextTrip) return null;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    let assistantText = "";

    try {
      await streamHansie({
        tripId: contextTrip.id,
        messages: nextMessages,
        onDelta: (delta) => {
          assistantText += delta;
          setMessages((current) => {
            const last = current[current.length - 1];
            if (last?.role === "assistant") {
              return current.map((message, index) =>
                index === current.length - 1
                  ? { ...message, content: assistantText }
                  : message,
              );
            }
            return [...current, { role: "assistant", content: assistantText }];
          });
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Hansie is tijdelijk niet bereikbaar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const triggerPosition = isMobile
    ? isTripRoute
      ? "bottom-24 right-4"
      : "bottom-5 right-4"
    : "bottom-6 right-6";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed z-50 inline-flex h-12 items-center gap-2 rounded-full border border-primary/20 bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_12px_30px_-12px_hsl(var(--primary)/0.75)] transition-transform hover:-translate-y-0.5 ${triggerPosition}`}
        aria-label={`Vraag Hansie over ${contextTrip.name}`}
      >
        <Sparkles className="h-4 w-4" />
        <span>Hansie</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={isMobile ? "h-[82vh] rounded-t-3xl p-0" : "w-full p-0 sm:max-w-md"}
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
              <div className="flex items-center gap-3 pr-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="font-display text-lg font-extrabold">Hansie</SheetTitle>
                  <SheetDescription className="mt-0.5 truncate">
                    Voor {contextTrip.name}
                  </SheetDescription>
                </div>
              </div>

              {!isTripRoute && availableTrips.length > 1 && (
                <label className="relative mt-3 block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Reiscontext</span>
                  <select
                    value={contextTrip.id}
                    onChange={(event) => setSelectedTripId(event.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-border bg-secondary/45 pl-3 pr-9 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
                  >
                    {availableTrips.map((trip) => (
                      <option key={trip.id} value={trip.id}>{trip.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-muted-foreground" />
                </label>
              )}
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center gap-6 py-8">
                  <div>
                    <p className="font-display text-2xl font-extrabold tracking-tight">Wat wil je weten?</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Hansie kijkt alleen naar <strong className="font-semibold text-foreground">{contextTrip.name}</strong> en helpt je bepalen wat vaststaat en wat nog aandacht vraagt.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void send(suggestion)}
                        className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-left text-sm font-semibold transition-colors hover:border-primary/30 hover:bg-secondary/40"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === "user"
                            ? "rounded-br-md bg-foreground text-background"
                            : "rounded-bl-md border border-border bg-card"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && messages[messages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border bg-background p-4 safe-area-pb">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Vraag Hansie..."
                disabled={loading}
                autoComplete="off"
                className="h-11 rounded-xl"
              />
              <Button type="submit" size="icon" className="h-11 w-11 rounded-xl" disabled={loading || !input.trim()} aria-label="Verstuur vraag">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
