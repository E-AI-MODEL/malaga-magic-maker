import { useState, useMemo, useCallback } from "react";
import { Trophy, RotateCcw, Palmtree, MapPin, Sparkles, PiggyBank, HandHelping, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Category {
  key: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const CATEGORIES: Category[] = [
  { key: "golfEase", label: "Golf gemak", desc: "Dichtbij de baan, snel op de green", icon: <Flag className="h-7 w-7" /> },
  { key: "beachLife", label: "Strand & avondleven", desc: "Zon, zee en stappen", icon: <Palmtree className="h-7 w-7" /> },
  { key: "exploring", label: "Omgeving ontdekken", desc: "Dorpjes, markten, cultuur", icon: <MapPin className="h-7 w-7" /> },
  { key: "luxury", label: "Comfort & luxe", desc: "Mooi verblijf, zwembad, ruimte", icon: <Sparkles className="h-7 w-7" /> },
  { key: "budget", label: "Budget laag houden", desc: "Zo voordelig mogelijk", icon: <PiggyBank className="h-7 w-7" /> },
  { key: "lowHassle", label: "Gemak & ontzorging", desc: "Alles geregeld, geen gedoe", icon: <HandHelping className="h-7 w-7" /> },
];

type Pair = [number, number];

function generatePairs(): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < CATEGORIES.length; i++) {
    for (let j = i + 1; j < CATEGORIES.length; j++) {
      pairs.push([i, j]);
    }
  }
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

function normalizeToHundred(wins: Record<string, number>): Record<string, number> {
  const total = Object.values(wins).reduce((a, b) => a + b, 0);
  if (total === 0) {
    // Equal distribution
    const base = Math.floor(100 / 6 / 5) * 5;
    const result: Record<string, number> = {};
    CATEGORIES.forEach((c, i) => {
      result[c.key] = i === 0 ? 100 - base * 5 : base;
    });
    return result;
  }

  // Convert to proportional, round to 5s
  const raw = CATEGORIES.map(c => ({ key: c.key, value: (wins[c.key] || 0) / total * 100 }));
  const rounded = raw.map(r => ({ ...r, rounded: Math.round(r.value / 5) * 5 }));

  // Adjust to sum exactly 100
  let sum = rounded.reduce((a, r) => a + r.rounded, 0);
  while (sum !== 100) {
    const diff = sum > 100 ? -5 : 5;
    // Find the item with largest rounding error in the right direction
    let bestIdx = 0;
    let bestErr = -Infinity;
    rounded.forEach((r, i) => {
      const err = diff > 0 ? (r.value - r.rounded) : (r.rounded - r.value);
      if (err > bestErr && r.rounded + diff >= 0) {
        bestErr = err;
        bestIdx = i;
      }
    });
    rounded[bestIdx].rounded += diff;
    sum += diff;
  }

  const result: Record<string, number> = {};
  rounded.forEach(r => { result[r.key] = r.rounded; });
  return result;
}

interface DilemmaGameProps {
  onComplete: (points: Record<string, number>) => void;
  initialPoints?: Record<string, number>;
}

export function DilemmaGame({ onComplete, initialPoints }: DilemmaGameProps) {
  const pairs = useMemo(() => generatePairs(), []);
  const [step, setStep] = useState(0);
  const [wins, setWins] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    CATEGORIES.forEach(c => { w[c.key] = 0; });
    return w;
  });
  const [chosen, setChosen] = useState<"left" | "right" | null>(null);
  const [finished, setFinished] = useState(false);
  const [finalPoints, setFinalPoints] = useState<Record<string, number> | null>(initialPoints || null);

  const total = pairs.length;
  const progress = (step / total) * 100;

  const handleChoice = useCallback((winnerIdx: number) => {
    if (chosen) return; // prevent double-tap
    const winnerKey = CATEGORIES[winnerIdx].key;
    const side = winnerIdx === pairs[step][0] ? "left" : "right";
    setChosen(side);

    const newWins = { ...wins, [winnerKey]: wins[winnerKey] + 1 };
    setWins(newWins);

    setTimeout(() => {
      setChosen(null);
      if (step + 1 >= total) {
        const pts = normalizeToHundred(newWins);
        setFinalPoints(pts);
        setFinished(true);
        onComplete(pts);
      } else {
        setStep(s => s + 1);
      }
    }, 400);
  }, [chosen, step, wins, pairs, total, onComplete]);

  const handleReset = () => {
    setStep(0);
    setWins(() => {
      const w: Record<string, number> = {};
      CATEGORIES.forEach(c => { w[c.key] = 0; });
      return w;
    });
    setChosen(null);
    setFinished(false);
    setFinalPoints(null);
  };

  if (finished && finalPoints) {
    const sorted = CATEGORIES.map(c => ({ ...c, pts: finalPoints[c.key] })).sort((a, b) => b.pts - a.pts);
    return (
      <div className="space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 mb-2">
            <Trophy className="h-7 w-7 text-primary" />
          </div>
          <h4 className="font-display font-extrabold text-lg text-white">Jouw verdeling</h4>
          <p className="text-white/50 text-sm">Op basis van 15 keuzes, genormaliseerd naar 100 punten</p>
        </div>

        <div className="space-y-3">
          {sorted.map((item) => (
            <div key={item.key} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-white/40">{item.icon}</span>
                  <span className="text-sm font-semibold text-white/80">{item.label}</span>
                </div>
                <span className="font-display font-extrabold text-primary tabular-nums">{item.pts}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${item.pts}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-white/30 text-xs">Totaal: 100 punten</span>
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-white/50 hover:text-white gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Opnieuw
          </Button>
        </div>
      </div>
    );
  }

  const [leftIdx, rightIdx] = pairs[step];
  const left = CATEGORIES[leftIdx];
  const right = CATEGORIES[rightIdx];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Keuze {step + 1} van {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-white/10 [&>div]:bg-primary" />
      </div>

      <p className="text-sm text-white/60 text-center">Wat vind je belangrijker?</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Left tile */}
        <button
          onClick={() => handleChoice(leftIdx)}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all duration-300 min-h-[160px] text-center",
            chosen === "left"
              ? "border-primary bg-primary/20 scale-105"
              : chosen === "right"
                ? "border-white/5 bg-white/5 opacity-40 scale-95"
                : "border-white/10 bg-white/10 hover:border-primary/50 hover:bg-white/15 active:scale-95"
          )}
        >
          <span className="text-white/60">{left.icon}</span>
          <span className="font-display font-bold text-sm text-white leading-tight">{left.label}</span>
          <span className="text-[11px] text-white/40 leading-snug">{left.desc}</span>
        </button>

        {/* Right tile */}
        <button
          onClick={() => handleChoice(rightIdx)}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl border-2 transition-all duration-300 min-h-[160px] text-center",
            chosen === "right"
              ? "border-primary bg-primary/20 scale-105"
              : chosen === "left"
                ? "border-white/5 bg-white/5 opacity-40 scale-95"
                : "border-white/10 bg-white/10 hover:border-primary/50 hover:bg-white/15 active:scale-95"
          )}
        >
          <span className="text-white/60">{right.icon}</span>
          <span className="font-display font-bold text-sm text-white leading-tight">{right.label}</span>
          <span className="text-[11px] text-white/40 leading-snug">{right.desc}</span>
        </button>
      </div>

      <p className="text-[10px] text-white/20 text-center">Tik op je voorkeur</p>
    </div>
  );
}
