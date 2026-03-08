import { useState, useRef, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Send, Loader2, UtensilsCrossed, Map, Flag, Moon, ShoppingCart, Menu, Trash2, ChevronRight, ArrowLeft, Sun, Waves, Car, Wine, Music, Utensils, Beer, Palmtree, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import vakansielogo from "@/assets/vakansie-logo.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Msg = { role: "user" | "assistant"; content: string };

type MenuCategory = {
  label: string;
  icon: any;
  desc: string;
  items: { label: string; prompt: string }[];
};

const MENU: MenuCategory[] = [
  {
    label: "Eten & drinken", icon: UtensilsCrossed, desc: "Restaurants, bars en boodschappen",
    items: [
      { label: "Restaurants voor groepen", prompt: "Geef 3-5 restaurants bij onze verblijflocatie die geschikt zijn voor een groep van 6. Noem per restaurant: naam, type keuken, sfeer, gemiddelde prijs p.p. en Google Maps-link of adres. Houd rekening met ons budget en dieetwensen." },
      { label: "Tapas & authentiek Spaans", prompt: "Wat zijn de beste authentieke tapas-bars en lokale eetplekken bij ons verblijf? Noem naam, must-try gerechten, prijs-indicatie en adres. Geen toeristenvallen." },
      { label: "Ontbijt- & lunchplekken", prompt: "Waar kunnen we goed ontbijten of lunchen in de buurt? Noem 3-4 plekken met type (bakkerij/café/chiringuito), prijs en of ze geschikt zijn voor een groep." },
      { label: "Supermarkten & boodschappen", prompt: "Waar doen we het beste boodschappen bij ons verblijf? Noem de dichtstbijzijnde supermarkten (Mercadona, Lidl, Aldi) met afstand, openingstijden, en tips voor Spaanse producten die we moeten proberen." },
    ],
  },
  {
    label: "Golf", icon: Flag, desc: "Banen, boekingen en tips",
    items: [
      { label: "Golfbanen dichtbij ons", prompt: "Welke golfbanen liggen binnen 20 minuten rijden van ons verblijf? Noem per baan: naam, afstand in minuten, greenfee in april, baanconditie en online boekingslink. We willen 2-3 rondes van 18 holes spelen." },
      { label: "Prijs-kwaliteit ranking", prompt: "Maak een top 5 ranking van golfbanen in de regio op prijs-kwaliteit. Per baan: greenfee, baanconditie (1-5 sterren), bereikbaarheid vanuit ons verblijf, en of er groepskorting mogelijk is." },
      { label: "Boeken & dresscode", prompt: "Hoe en wanneer boeken we golftijden in april? Geef concrete tips: hoeveel weken vooruit, welke websites/apps, dresscode per baan, en of er buggy's te huur zijn." },
      { label: "Golfplan voor 3 dagen", prompt: "Stel een concreet golfplan voor over onze 3 verblijfsdagen. Per dag: welke baan, waarom, tee-time advies, reistijd vanaf verblijf, en lunch-optie bij de baan. Houd rekening met 2-3 rondes totaal." },
    ],
  },
  {
    label: "Vervoer", icon: Car, desc: "Huurauto, taxi en transfers",
    items: [
      { label: "Huurauto: wel of niet?", prompt: "Moeten we een auto huren voor onze groep van 6, of redden we het met taxi's? Vergelijk de opties: kosten huurauto (type bus/SUV) vs. taxi voor 3 dagen, parkeersituatie bij ons verblijf, en flexibiliteit. Geef een concreet advies." },
      { label: "Huurauto boeken", prompt: "Waar boeken we het beste een huurauto bij Málaga Airport voor een groep van 6? Noem 3 verhuurders met prijs-indicatie voor een 7-zitter, verzekering-tips, en ophaal/inlever-procedure op het vliegveld." },
      { label: "Taxi & transfers", prompt: "Hoe werkt taxi in deze regio? Noem de beste taxi-apps (Uber, Cabify, lokaal), gemiddelde tarieven vliegveld→verblijf en verblijf→centrum, en tips voor groepsritten met 6 personen." },
      { label: "Transfer vliegveld", prompt: "Wat zijn de opties voor transfer van Málaga Airport naar ons verblijf? Vergelijk: privétransfer, gedeelde shuttle, taxi, en huurauto. Noem prijzen en boekingslinks." },
    ],
  },
  {
    label: "Activiteiten", icon: Sun, desc: "Strand, cultuur en uitstapjes",
    items: [
      { label: "Stranden in de buurt", prompt: "Wat zijn de 3-5 beste stranden bij ons verblijf? Noem per strand: naam, afstand (lopend/rijdend), type (rustig/levendig), chiringuito's, en parkeermogelijkheden." },
      { label: "Dagtripjes", prompt: "Stel 3 concrete dagtripjes voor vanuit ons verblijf voor een groep van 6. Per trip: bestemming, reistijd, wat te doen, kosten en lunchplek. Mix cultuur en natuur." },
      { label: "Padel & sport", prompt: "Waar kunnen we padel spelen, of andere sportieve activiteiten doen (behalve golf)? Noem locaties bij ons verblijf, baan-huur prijzen, en of je moet reserveren." },
      { label: "Dorpjes & markten", prompt: "Welke typische Andalusische dorpjes en lokale markten zijn de moeite waard bij ons verblijf? Noem naam, afstand, beste dag/tijd om te gaan, en wat er te zien/kopen is." },
    ],
  },
  {
    label: "Avond & uitgaan", icon: Moon, desc: "Bars, muziek en avondprogramma",
    items: [
      { label: "Bars & terrassen", prompt: "Waar kunnen we 's avonds goed een drankje doen met 6 man? Noem 3-5 bars/terrassen bij ons verblijf met sfeer (rooftop/beach/lounge), gemiddelde prijzen en of je moet reserveren." },
      { label: "Live muziek in april", prompt: "Waar is er live muziek of entertainment in de buurt in begin april? Noem locaties, type muziek, welke avonden, en of er entree is." },
      { label: "Avondprogramma per dag", prompt: "Stel voor elke avond van ons verblijf (do/vr/za) een concreet avondprogramma voor. Mix rustige en uitgaansavonden. Noem specifieke locaties en tijden." },
    ],
  },
  {
    label: "Praktisch", icon: ShoppingCart, desc: "Weer, kosten en handige tips",
    items: [
      { label: "Weer & inpaktips april", prompt: "Wat is het typische weer begin april aan de Costa del Sol? Geef concrete inpaktips voor golf, strand en avond uit. Hoeveel graden, kans op regen?" },
      { label: "Kostenplaatje inschatting", prompt: "Geef een realistische inschatting van de totale kosten per persoon voor 3 nachten aan de Costa del Sol. Splits uit in: accommodatie, golf, eten, vervoer en overig. Baseer je op ons groepsprofiel." },
      { label: "Handige apps & nummers", prompt: "Welke apps en telefoonnummers zijn essentieel voor onze reis? Noem per categorie (taxi, eten, navigatie, vertaling, noodgevallen) de beste optie." },
      { label: "Spaans voor beginners", prompt: "Geef de 15 meest nuttige Spaanse zinnen en woorden voor onze reis. Denk aan: bestellen in restaurants, taxi nemen, golf, en beleefdheden. Met uitspraaktips." },
    ],
  },
];

import { supabase } from "@/integrations/supabase/client";

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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    onError("Je bent niet ingelogd.");
    return;
  }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
/** Split assistant markdown into intro + accordion sections by ## headers */
function AssistantMessage({ content, isStreaming, proseSize = "prose-sm" }: { content: string; isStreaming: boolean; proseSize?: string }) {
  const sections = useMemo(() => {
    const parts = content.split(/^## /m);
    const intro = parts[0]?.trim() || "";
    const items = parts.slice(1).map((part) => {
      const newlineIdx = part.indexOf("\n");
      const title = newlineIdx > -1 ? part.slice(0, newlineIdx).trim() : part.trim();
      const body = newlineIdx > -1 ? part.slice(newlineIdx + 1).trim() : "";
      return { title, body };
    });
    return { intro, items };
  }, [content]);

  // While streaming or if no sections found, show plain markdown
  if (isStreaming || sections.items.length === 0) {
    return (
      <div className={`prose ${proseSize} dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.intro && (
        <div className={`prose ${proseSize} dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}>
          <ReactMarkdown>{sections.intro}</ReactMarkdown>
        </div>
      )}
      <Accordion type="multiple" className="space-y-1">
        {sections.items.map((item, idx) => (
          <AccordionItem key={idx} value={`s-${idx}`} className="border border-border/60 rounded-lg px-3 overflow-hidden">
            <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline text-left">
              {item.title}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className={`prose ${proseSize} dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}>
                <ReactMarkdown>{item.body}</ReactMarkdown>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export default function Reisplanner() {
  const { activeTrip } = useTrip();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MenuCategory | null>(null);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem("ai-guide-fontsize");
    return saved ? Number(saved) : 0; // 0=tiny(default), 1=small, 2=medium
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fontSizeClass = ["text-[10px] leading-[1.5]", "text-[11px] leading-[1.5]", "text-xs leading-[1.6]"][fontSize] || "text-[10px] leading-[1.5]";
  const proseSizeClass = [
    "prose prose-sm dark:prose-invert [&_p]:text-[10px] [&_p]:leading-[1.5] [&_li]:text-[10px] [&_li]:leading-[1.5] [&_strong]:text-[10px] [&_a]:text-[10px] [&_h3]:text-[11px] [&_h4]:text-[10px]",
    "prose prose-sm dark:prose-invert [&_p]:text-[11px] [&_p]:leading-[1.5] [&_li]:text-[11px] [&_li]:leading-[1.5] [&_strong]:text-[11px] [&_a]:text-[11px] [&_h3]:text-xs [&_h4]:text-[11px]",
    "prose prose-sm dark:prose-invert [&_p]:text-xs [&_p]:leading-[1.6] [&_li]:text-xs [&_li]:leading-[1.6] [&_strong]:text-xs [&_a]:text-xs [&_h3]:text-sm [&_h4]:text-xs",
  ][fontSize] || proseSizeClass[0];

  const adjustFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.max(0, Math.min(2, prev + delta));
      localStorage.setItem("ai-guide-fontsize", String(next));
      return next;
    });
  };

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
          {/* Font size controls */}
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] text-white/30 mr-1">Tekst</span>
            <button
              onClick={() => adjustFontSize(-1)}
              disabled={fontSize === 0}
              className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <button
              onClick={() => adjustFontSize(1)}
              disabled={fontSize === 2}
              className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
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
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${fontSizeClass} ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <AssistantMessage content={msg.content} isStreaming={isLoading && i === messages.length - 1} proseSize={proseSize} />
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

        {/* Input bar */}
        <div className="border-t border-border bg-background px-4 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 max-w-2xl mx-auto"
          >
            {/* Burger menu with categories */}
            <Popover open={menuOpen} onOpenChange={(open) => { setMenuOpen(open); if (!open) setActiveCategory(null); }}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="rounded-xl h-10 w-10 shrink-0 text-muted-foreground">
                  <Menu className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 p-2">
                {!activeCategory ? (
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-1 pb-2">Waar kan ik mee helpen?</p>
                    {MENU.map((cat) => (
                      <button
                        key={cat.label}
                        onClick={() => setActiveCategory(cat)}
                        className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary/80 transition-colors"
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <cat.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{cat.label}</p>
                          <p className="text-[11px] text-muted-foreground">{cat.desc}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      </button>
                    ))}
                    {messages.length > 0 && (
                      <>
                        <div className="border-t border-border my-1.5" />
                        <button
                          onClick={() => { setMessages([]); setMenuOpen(false); }}
                          className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-medium">Gesprek wissen</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-2 py-1.5 hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Terug
                    </button>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-3 pt-1 pb-1.5">{activeCategory.label}</p>
                    {activeCategory.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { send(item.prompt); setMenuOpen(false); setActiveCategory(null); }}
                        disabled={isLoading}
                        className="flex items-center gap-2.5 w-full text-left text-sm font-medium px-3 py-2.5 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>

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
