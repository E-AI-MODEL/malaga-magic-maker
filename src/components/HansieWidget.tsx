import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePlatformSwitches } from "@/features/ops/settings";
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

export type HansieTrip = { id: string; name: string };

export function HansieWidget({
  trip,
  floating = true,
}: {
  trip: HansieTrip | null;
  floating?: boolean;
}) {
  const isMobile = useIsMobile();
  const { isAdmin } = useAuth();
  const { hansieEnabled } = usePlatformSwitches();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const contextIdRef = useRef<string | null>(trip?.id ?? null);
  const tripId = trip?.id ?? null;

  useEffect(() => {
    contextIdRef.current = tripId;
    setMessages([]);
    setInput("");
    setLoading(false);
    setOpen(false);
  }, [tripId]);

  const suggestions = useMemo(
    () => ["Ben ik klaar voor vertrek?", "Wat ontbreekt nog?", "Wat moet deze week?", "Vat deze reis samen"],
    [],
  );

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !trip) return;

    const requestTripId = trip.id;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    let assistantText = "";

    try {
      await streamHansie({
        tripId: requestTripId,
        messages: nextMessages,
        onDelta: (delta) => {
          if (contextIdRef.current !== requestTripId) return;
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
      if (contextIdRef.current !== requestTripId) return;
      toast.error(error instanceof Error ? error.message : "Hansie is tijdelijk niet bereikbaar.");
    } finally {
      if (contextIdRef.current === requestTripId) setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  if (!trip) return null;
  if (!hansieEnabled && !isAdmin) return null;

  return (
    <>
      <div
        className={
          floating
            ? `fixed z-40 border-t border-border bg-background px-3 pb-2 pt-1.5 ${
                isMobile
                  ? "bottom-[calc(3.625rem+env(safe-area-inset-bottom))] left-0 right-0"
                  : "bottom-0 right-0 w-full max-w-md"
              }`
            : "sticky bottom-0 left-0 right-0 z-40 border-t border-border bg-background px-3 pb-2 pt-1.5 safe-area-pb"
        }
      >
        <button
          onClick={() => setOpen(true)}
          className="mx-auto flex h-[46px] w-full max-w-2xl items-center gap-2.5 rounded-[16px] border border-border bg-card px-3.5 text-left shadow-soft transition-colors hover:bg-secondary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Vraag het Hansie"
        >
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] bg-primary/10 text-primary">
            <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1 truncate font-ui text-[13px] text-muted-foreground">Vraag Hansie over deze reis…</span>
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Send className="h-3.5 w-3.5" strokeWidth={1.9} />
          </span>
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={isMobile ? "h-[87vh] rounded-t-[18px] p-0" : "w-full p-0 sm:max-w-md"}
        >
          <div className="flex h-full flex-col bg-background">
            <SheetHeader className="border-b border-border bg-card px-5 py-4 text-left">
              <SheetTitle className="flex items-center gap-2.5 font-brand text-xl font-semibold">
                <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                  <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  Hansie
                  <span className="block truncate font-ui text-[11px] font-semibold text-muted-foreground">{trip.name}</span>
                </span>
              </SheetTitle>
              <SheetDescription>
                Vraag wat in deze reis vaststaat of nog aandacht nodig heeft.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center gap-5 py-8">
                  <div>
                    <p className="font-brand text-2xl font-semibold">Waar kan ik mee helpen?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Hansie gebruikt alleen de reis die je nu hebt geopend als context.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => void send(suggestion)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 font-ui text-[13px] font-medium shadow-soft transition-colors hover:bg-secondary/50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none text-[15px] leading-relaxed dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="max-w-[85%] rounded-2xl rounded-br-md border border-border bg-card px-3.5 py-2 text-sm font-medium shadow-soft">
                          {message.content}
                        </p>
                      )}
                    </div>
                  ))}
                  {loading && messages[messages.length - 1]?.role !== "assistant" && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2 border-t border-border bg-card p-4">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Vraag Hansie over deze reis…"
                disabled={loading}
                autoComplete="off"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Verstuur vraag">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
