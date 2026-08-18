import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, Send, Trash2, X } from "lucide-react";
import { useTrip } from "@/contexts/TripContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-ai-chat`;
const SUGGESTIONS = [
  "Wat moet ik nog regelen?",
  "Wat staat er als eerste op de planning?",
  "Welke open taken en keuzes zijn er?",
  "Welke reispapieren staan al opgeslagen?",
];

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
  onError: (message: string) => void;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    onError("Je bent niet ingelogd.");
    return;
  }

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages: messages.slice(-20), tripId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    onError(typeof body.error === "string" ? body.error : "Hansie is even niet beschikbaar.");
    return;
  }
  if (!response.body) {
    onError("Hansie gaf geen antwoord terug.");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline = buffer.indexOf("\n");
    while (newline !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        const content = parsed.choices?.[0]?.delta?.content;
        if (typeof content === "string") onDelta(content);
      } catch {
        // Ignore incomplete/non-content SSE messages.
      }
    }
  }

  onDone();
}

function ChatContent({ onClose }: { onClose: () => void }) {
  const { activeTrip } = useTrip();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setError("");
  }, [activeTrip?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || !activeTrip || loading) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: prompt }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setError("");
    setLoading(true);

    await streamChat({
      messages: nextMessages,
      tripId: activeTrip.id,
      onDelta: (delta) => {
        setMessages((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last?.role === "assistant") next[next.length - 1] = { ...last, content: last.content + delta };
          return next;
        });
      },
      onDone: () => setLoading(false),
      onError: (message) => {
        setLoading(false);
        setError(message);
        setMessages((current) => current.filter((messageItem, index) => !(index === current.length - 1 && messageItem.role === "assistant" && !messageItem.content)));
      },
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold">Hansie</p>
          <p className="truncate text-[11px] text-muted-foreground">{activeTrip?.name || "Je reis"} · leest mee, past niets zelf aan</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMessages([]); setError(""); }} aria-label="Gesprek wissen">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Hansie sluiten">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-sm flex-col justify-center py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <h2 className="mt-4 font-display text-xl font-extrabold">Waar kan ik bij helpen?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ik kan uitleggen wat bij deze reis staat opgeslagen en wat nog aandacht nodig heeft.</p>
            <div className="mt-5 space-y-2 text-left">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => void send(suggestion)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:border-primary/30"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={message.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground" : "max-w-[92%] rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-sm text-foreground"}>
                  {message.role === "assistant" ? (
                    message.content ? <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{message.content}</ReactMarkdown></div> : <span className="text-muted-foreground">Even kijken…</span>
                  ) : message.content}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        {error && <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Vraag Hansie…"
            disabled={loading || !activeTrip}
            maxLength={6000}
            className="h-10 min-w-0 flex-1 rounded-xl bg-secondary px-3 text-[16px] outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 sm:text-sm"
          />
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={!input.trim() || loading || !activeTrip}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { activeTrip } = useTrip();

  if (!activeTrip) return null;

  if (isMobile) {
    return (
      <>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-[4.5rem] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
            aria-label="Vraag Hansie"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        )}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[92dvh] overflow-hidden rounded-t-2xl p-0">
            <SheetTitle className="sr-only">Hansie</SheetTitle>
            <ChatContent onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Vraag Hansie</span>
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[620px] w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <ChatContent onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}
