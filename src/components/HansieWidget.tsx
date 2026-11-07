import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { CalendarDays, Compass, Info, LayoutGrid, Loader2, MessageCircle, Navigation, Send, UtensilsCrossed, type LucideIcon } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import { listTripItems } from "@/features/travel/data";
import { listDecisions, listExpenses } from "@/features/together/data";
import { HANSIE_FOLLOW_UPS, HANSIE_TOPICS, hansieSuggestions, type HansieTopic } from "@/features/hansie/suggestions";

const TOPIC_ICONS: Record<HansieTopic, LucideIcon> = {
  eten: UtensilsCrossed,
  doen: Compass,
  gewoonten: Info,
  vervoer: Navigation,
  vandaag: CalendarDays,
};
import { useLocation, useSearchParams } from "react-router-dom";
import { HANSIE_ASK_EVENT, hansieBarLabel, hansiePageFromPath } from "@/features/hansie/bus";

function HansieMark({ className = "h-8 w-8 text-[15px]" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold uppercase leading-none text-primary-foreground ${className}`}
    >
      H
    </span>
  );
}

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

export type HansieTrip = { id: string; name: string; start_date?: string | null; end_date?: string | null; destination_name?: string | null };

function TopicGrid({ onPick }: { onPick: (topic: (typeof HANSIE_TOPICS)[number]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 pb-1">
      {HANSIE_TOPICS.map((t, index) => {
        const Icon = TOPIC_ICONS[t.key];
        return (
          <Button
            key={t.key}
            type="button"
            variant="secondary"
            onClick={() => onPick(t)}
            className={`min-h-[76px] flex-col items-start justify-between rounded-lg bg-card p-3 text-left text-foreground ${index === HANSIE_TOPICS.length - 1 ? "col-span-2 min-h-14 flex-row items-center justify-start" : ""}`}
          >
            <Icon className="!size-5" aria-hidden />
            <span className="text-[15px] font-semibold">{t.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

export function HansieWidget({
  trip,
  floating = true,
}: {
  trip: HansieTrip | null;
  floating?: boolean;
}) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = hansiePageFromPath(pathname);
  const { isAdmin } = useAuth();
  const { hansieEnabled } = usePlatformSwitches();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState<HansieTopic | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const contextIdRef = useRef<string | null>(trip?.id ?? null);
  const tripId = trip?.id ?? null;

  useEffect(() => {
    contextIdRef.current = tripId;
    setMessages([]);
    setInput("");
    setLoading(false);
    setOpen(false);
    setTopic(null);
    setMenuOpen(false);
  }, [tripId]);

  const itemsQuery = useQuery({
    queryKey: ["trip-items", tripId],
    queryFn: () => listTripItems(tripId as string),
    enabled: Boolean(tripId && open),
  });
  const decisionsQuery = useQuery({
    queryKey: ["trip-decisions", tripId],
    queryFn: () => listDecisions(tripId as string),
    enabled: Boolean(tripId && open),
  });
  const expensesQuery = useQuery({
    queryKey: ["together-expenses", tripId],
    queryFn: () => listExpenses(tripId as string),
    enabled: Boolean(tripId && open),
  });

  const suggestions = useMemo(
    () =>
      hansieSuggestions({
        now: new Date(),
        startDate: trip?.start_date ?? null,
        endDate: trip?.end_date ?? null,
        itemCount: itemsQuery.data?.length ?? 0,
        openDecisionTitle: decisionsQuery.data?.find((decision) => decision.status === "open")?.title ?? null,
        expenseCount: expensesQuery.data?.length ?? 0,
      }),
    [trip?.start_date, trip?.end_date, itemsQuery.data, decisionsQuery.data, expensesQuery.data],
  );

  const send = async (text: string, nextTopic?: HansieTopic) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !trip) return;
    setMenuOpen(false);
    if (nextTopic) setTopic(nextTopic);

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

  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    const onAsk = (event: Event) => {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question || "";
      setOpen(true);
      if (question) void sendRef.current(question);
    };
    window.addEventListener(HANSIE_ASK_EVENT, onAsk);
    return () => window.removeEventListener(HANSIE_ASK_EVENT, onAsk);
  }, []);

  useEffect(() => {
    const question = searchParams.get("vraag");
    if (!question || !tripId) return;
    const next = new URLSearchParams(searchParams);
    next.delete("vraag");
    setSearchParams(next, { replace: true });
    setOpen(true);
    void sendRef.current(question);
  }, [searchParams, setSearchParams, tripId]);

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
            ? "fixed bottom-[calc(62px+max(6px,env(safe-area-inset-bottom)))] inset-x-0 z-40 border-t border-border bg-card px-3 py-1.5"
            : "sticky bottom-0 left-0 right-0 z-40 border-t border-border bg-background px-3 pb-2 pt-1.5 safe-area-pb"
        }
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(true)}
          className={floating
            ? "tile-hansie mx-auto flex h-[48px] w-full max-w-lg items-center gap-2.5 rounded-2xl px-2 text-left hover:bg-hansie"
            : "mx-auto flex h-[48px] w-full items-center gap-2.5 tile-hansie rounded-2xl px-3.5 text-left hover:bg-hansie focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"}
          aria-label="Vraag het Hansie"
        >
          <HansieMark className="h-8 w-8 text-[15px]" />
          <span className="min-w-0 flex-1 truncate font-ui text-[14px] font-medium text-foreground/80">{hansieBarLabel(page)}</span>
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/85 text-background">
            <Send className="h-3.5 w-3.5" strokeWidth={1.9} />
          </span>
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={isMobile ? "h-[87vh] rounded-t-md p-0" : "w-full p-0 sm:max-w-md"}
        >
          <div className="flex h-full flex-col bg-background">
            <SheetHeader className="border-b border-border bg-card px-5 py-4 text-left">
              <SheetTitle className="flex items-center gap-2.5 font-display text-xl font-extrabold uppercase tracking-tight">
                <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-sm bg-foreground text-background">
                  <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  Hansie
                  <span className="block truncate font-ui text-[11px] font-semibold text-muted-foreground">{trip.name}</span>
                </span>
              </SheetTitle>
              <SheetDescription>
                {trip.destination_name ? `Je gids in ${trip.destination_name}.` : "Je gids voor deze reis."}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex flex-col gap-5 py-2">
                  <p className="font-display text-2xl font-bold tracking-tight">
                    {trip.destination_name ? `Kies wat je wilt weten over ${trip.destination_name}` : "Kies wat je wilt weten"}
                  </p>
                  <TopicGrid onPick={(t) => void send(t.question, t.key)} />
                  {suggestions.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">Over de reis</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.slice(0, 2).map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => void send(suggestion)}
                            className="rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
                        <p className="max-w-[85%] rounded-md rounded-br-none bg-foreground px-3.5 py-2 text-sm font-medium text-background">
                          {message.content}
                        </p>
                      )}
                    </div>
                  ))}
                  {loading && messages[messages.length - 1]?.role !== "assistant" && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!loading && topic && messages[messages.length - 1]?.role === "assistant" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {HANSIE_FOLLOW_UPS[topic].map((followUp) => (
                        <Button key={followUp} type="button" variant="secondary" className="min-h-11 rounded-md px-3 text-sm" onClick={() => void send(followUp)}>
                          {followUp}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {messages.length > 0 && menuOpen && (
              <div className="border-t border-border bg-background px-4 pt-4">
                <TopicGrid onPick={(t) => void send(t.question, t.key)} />
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2 border-t border-border bg-card p-4">
              {messages.length > 0 && (
                <Button type="button" variant="secondary" size="icon" aria-label="Onderwerpen" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              )}
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Vraag Hansie over deze reis…"
                disabled={loading}
                autoComplete="off"
              />
              <Button type="submit" size="icon" className="bg-foreground/85 text-background hover:bg-foreground" disabled={loading || !input.trim()} aria-label="Verstuur vraag">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
