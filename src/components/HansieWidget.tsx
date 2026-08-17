import { FormEvent, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useTrip } from "@/contexts/TripContext";
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
  const { activeTrip } = useTrip();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const suggestions = useMemo(
    () => [
      "Wat staat er al vast voor deze reis?",
      "Wat moet ik nog regelen?",
      "Waar zitten nog open punten?",
    ],
    [],
  );

  if (!activeTrip) return null;

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
        tripId: activeTrip.id,
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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed z-50 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 ${
          isMobile ? "bottom-24 right-5 h-14 w-14" : "bottom-6 right-6 h-14 w-14"
        }`}
        aria-label="Vraag Hansie"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={isMobile ? "h-[78vh] rounded-t-2xl p-0" : "w-full sm:max-w-md p-0"}
        >
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-border px-5 py-4 text-left">
              <SheetTitle className="font-display text-lg font-extrabold">Hansie</SheetTitle>
              <SheetDescription>
                Vraag wat er voor {activeTrip.name} vaststaat of nog aandacht nodig heeft.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col justify-center gap-5 py-8">
                  <div>
                    <p className="font-display text-xl font-extrabold">Waar kan ik mee helpen?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Hansie gebruikt alleen de reis die je nu hebt geopend als context.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => void send(suggestion)}
                        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary/60"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${
                          message.role === "user"
                            ? "rounded-br-md bg-primary text-primary-foreground"
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

            <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-4">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Vraag Hansie..."
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
