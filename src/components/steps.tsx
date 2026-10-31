import { ReactNode, TouchEvent, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Step-by-step flow: one question per screen, auto-advance after a choice,
 * swipe to browse, and an editable summary at the end.
 */
export function useStepFlow<S extends string>(steps: S[], valid: Partial<Record<S, boolean>>, summary: S) {
  const [step, setStep] = useState<S>(steps[0]);
  const [backToSummary, setBackToSummary] = useState(false);
  const index = Math.max(0, steps.indexOf(step));
  const ok = (s: S) => valid[s] !== false;
  const go = (target: S) => setStep(target);
  /** Move on after a valid answer; returns to the summary when the user came from there. */
  const next = () => {
    if (!ok(step)) return;
    if (backToSummary) { setBackToSummary(false); setStep(summary); return; }
    setStep(steps[Math.min(index + 1, steps.length - 1)]);
  };
  const back = () => { if (index > 0) { setBackToSummary(false); setStep(steps[index - 1]); } };
  const edit = (target: S) => { setBackToSummary(true); setStep(target); };
  const reset = () => { setBackToSummary(false); setStep(steps[0]); };
  const complete = steps.every(ok);
  return { step, index, steps, go, next, back, edit, reset, backToSummary, complete, setStep };
}

type FrameProps = {
  total: number;
  index: number;
  onBack: () => void;
  onClose: () => void;
  onSwipeNext?: () => void;
  closeLabel?: string;
  children: ReactNode;
  hint?: boolean;
  className?: string;
};

export function StepFrame({ total, index, onBack, onClose, onSwipeNext, closeLabel = "Sluiten", children, hint = true, className }: FrameProps) {
  const touchX = useRef<number | null>(null);
  const onTouchStart = (event: TouchEvent) => {
    // Swipes that start inside text fields stay text selection.
    const target = event.target as HTMLElement;
    touchX.current = target.closest("input, textarea, select") ? null : event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchX.current; touchX.current = null;
    const end = event.changedTouches[0]?.clientX;
    if (start === null || end === undefined) return;
    if (end - start < -70) onSwipeNext?.();
    if (end - start > 70) onBack();
  };
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex items-center gap-3 px-4 pt-4">
        <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={onBack} disabled={index === 0} aria-label="Vorige stap"><ArrowLeft className="h-6 w-6" /></Button>
        <div className="flex flex-1 justify-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-label={`Stap ${index + 1} van ${total}`}>
          {Array.from({ length: total }, (_, i) => <span key={i} className={`h-1.5 rounded-full ${i === index ? "w-8 bg-foreground" : i < index ? "w-4 bg-foreground/50" : "w-4 bg-border"}`} />)}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-full" onClick={onClose} aria-label={closeLabel}><X className="h-6 w-6" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} aria-live="polite">
        {children}
        {hint && onSwipeNext && <p className="mt-6 text-center text-xs text-muted-foreground">Veeg naar links of rechts om te bladeren</p>}
      </div>
    </div>
  );
}

type SheetProps = Omit<FrameProps, "onClose"> & { open: boolean; onOpenChange: (open: boolean) => void; title: string };

export function StepSheet({ open, onOpenChange, title, ...frame }: SheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[92dvh] flex-col rounded-t-3xl border-t border-border bg-background px-0 pb-0 pt-0 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2 [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">Stap {frame.index + 1} van {frame.total}</SheetDescription>
        <StepFrame {...frame} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function StepQuestion({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return <div className="mb-5"><h3 className="font-display text-[32px] font-bold leading-tight">{children}</h3>{sub && <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{sub}</p>}</div>;
}

type TileProps = { children: ReactNode; onClick: () => void; icon?: ReactNode; selected?: boolean; strong?: boolean; disabled?: boolean; size?: "lg" | "md" };

/** Big tappable answer. */
export function StepTile({ children, onClick, icon, selected, strong, disabled, size = "md" }: TileProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border px-5 text-left text-lg font-semibold transition-colors disabled:opacity-50",
        size === "lg" ? "min-h-24" : "min-h-[72px] py-3",
        strong ? "border-foreground bg-foreground text-background hover:bg-foreground/90" : "border-border bg-card hover:bg-secondary active:bg-secondary",
        selected && !strong && "border-foreground ring-1 ring-foreground",
      )}>
      {icon && <span className="shrink-0 [&_svg]:h-7 [&_svg]:w-7">{icon}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {selected && <Check className="h-6 w-6 shrink-0" />}
    </button>
  );
}

export function StepChip({ children, onClick, selected }: { children: ReactNode; onClick: () => void; selected?: boolean }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={cn("h-12 rounded-full border px-4 text-[15px] font-semibold", selected ? "border-foreground bg-foreground text-background" : "border-border bg-card")}>{children}</button>;
}

export function StepNext({ onClick, disabled, children = "Volgende", busy, done }: { onClick?: () => void; disabled?: boolean; children?: ReactNode; busy?: boolean; done?: boolean }) {
  return (
    <Button type={onClick ? "button" : "submit"} onClick={onClick} disabled={disabled || busy} className="mt-6 h-16 w-full rounded-2xl font-display text-xl font-semibold [&_svg]:size-6">
      {busy && <Loader2 className="mr-2 animate-spin" />}
      {done ? <><Check className="mr-2" />{children}</> : <>{children}<ArrowRight className="ml-2" /></>}
    </Button>
  );
}

/** Summary list: every row jumps back to its step. */
export function StepSummary({ rows }: { rows: Array<{ label: string; value: ReactNode; onEdit: () => void }> }) {
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {rows.map((row) => (
        <li key={row.label}><button type="button" onClick={row.onEdit} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
          <span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{row.label}</span><span className="block break-words text-[17px] font-semibold">{row.value}</span></span>
          <span className="text-sm font-semibold underline underline-offset-4">Wijzig</span>
        </button></li>
      ))}
    </ul>
  );
}

export function StepError({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{message}</p>;
}
