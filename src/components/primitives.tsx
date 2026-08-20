import { useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Sparkles, X } from "lucide-react";

/** Warm white object surface on the off-white canvas. Depth without SaaS cards. */
export function Surface({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return (
    <Tag className={`rounded-[18px] border border-border bg-card shadow-soft ${className}`}>{children}</Tag>
  );
}

/** 36px soft icon container for important actions and section anchors. */
export function IconBubble({
  icon: Icon,
  tone = "default",
  className = "",
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number | string }>;
  tone?: "default" | "attention" | "muted";
  className?: string;
}) {
  const toneClass =
    tone === "attention"
      ? "bg-warning/12 text-warning"
      : tone === "muted"
        ? "bg-secondary text-muted-foreground"
        : "bg-primary/10 text-primary";
  return (
    <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${toneClass} ${className}`}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </span>
  );
}

/** Compact status chip. Word first, colour only as support. */
export function StatusChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "attention" | "done" }) {
  const toneClass =
    tone === "attention"
      ? "bg-warning/15 text-warning"
      : tone === "done"
        ? "bg-primary/10 text-primary"
        : "bg-secondary text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-ui text-[11px] font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

/** Quiet sentence-case section break. 13px semibold, never decorative uppercase. */
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-ui text-[13px] font-semibold text-foreground">{children}</h2>
      {action}
    </div>
  );
}

/** Status is always a word, never colour alone. */
export function StatusWord({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "done" | "attention" | "muted" }) {
  const toneClass =
    tone === "done"
      ? "text-primary"
      : tone === "attention"
        ? "text-warning"
        : tone === "muted"
          ? "text-muted-foreground/70"
          : "text-muted-foreground";
  return <span className={`shrink-0 text-[11px] font-semibold ${toneClass}`}>{children}</span>;
}

/** Hairline-separated list container. Rows live directly inside it. */
export function RowList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rule-divide ${className}`}>{children}</div>;
}

type RowItemProps = {
  icon?: ComponentType<{ className?: string }>;
  title: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  tone?: "default" | "attention";
  /** Render the leading icon inside a soft 36px container. */
  emphasis?: boolean;
};

/** icon · title · meta · chevron. The single row primitive of the product. */
export function RowItem({ icon: Icon, title, meta, trailing, to, onClick, tone = "default", emphasis = false }: RowItemProps) {
  const interactive = Boolean(to || onClick);
  const body = (
    <>
      {Icon && emphasis && <IconBubble icon={Icon} tone={tone === "attention" ? "attention" : "default"} />}
      {Icon && !emphasis && (
        <Icon className={`h-[18px] w-[18px] shrink-0 ${tone === "attention" ? "text-warning" : "text-muted-foreground"}`} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight">{title}</span>
        {meta && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
      {trailing && <span className="shrink-0 text-xs text-muted-foreground tabular">{trailing}</span>}
      {interactive && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
    </>
  );

  const className = `flex min-h-[48px] w-full items-center gap-3 py-3 text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
    interactive ? "transition-opacity hover:opacity-70" : ""
  }`;

  if (to) return <Link to={to} className={className}>{body}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={className}>{body}</button>;
  return <div className={className}>{body}</div>;
}

/** Thin segmented readiness bar plus one plain sentence. */
export function ReadinessBar({
  done,
  total,
  sentence,
  invert = false,
}: {
  done: number;
  total: number;
  sentence: string;
  invert?: boolean;
}) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
  return (
    <div>
      <div className={`h-[3px] w-full overflow-hidden rounded-full ${invert ? "bg-white/15" : "bg-rule"}`}>
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className={`mt-2 text-xs ${invert ? "text-white/60" : "text-muted-foreground"}`}>{sentence}</p>
    </div>
  );
}

/** Inline label · value pairs. Replaces KPI card grids. */
export function StatStrip({
  items,
  className = "",
}: {
  items: Array<{ label: string; value: ReactNode; onClick?: () => void }>;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {items.map((item, index) => {
        const content = (
          <>
            <span className="font-display text-base font-extrabold tabular">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </>
        );
        return (
          <div key={item.label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden className="mr-3 h-3 w-px bg-rule" />}
            {item.onClick ? (
              <button type="button" onClick={item.onClick} className="flex items-baseline gap-1.5 transition-opacity hover:opacity-70">
                {content}
              </button>
            ) : (
              <span className="flex items-baseline gap-1.5">{content}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** One sentence plus one text action. Never an oversized illustrated card. */
export function EmptyLine({ text, actionLabel, to, onClick }: { text: string; actionLabel?: string; to?: string; onClick?: () => void }) {
  return (
    <p className="py-4 text-sm leading-relaxed text-muted-foreground">
      {text}{" "}
      {actionLabel && to && <Link to={to} className="font-semibold text-primary underline-offset-4 hover:underline">{actionLabel}</Link>}
      {actionLabel && !to && onClick && (
        <button type="button" onClick={onClick} className="font-semibold text-primary underline-offset-4 hover:underline">{actionLabel}</button>
      )}
    </p>
  );
}

/** Compact segmented control. Max four segments by design. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ id: T; label: string }>;
}) {
  return (
    <div role="tablist" className="flex w-full rounded-[14px] border border-border bg-secondary/70 p-1 shadow-soft">
      {options.map((option) => (
        <button
          key={option.id}
          role="tab"
          type="button"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={`flex-1 rounded-[10px] px-2 py-2 text-[13px] font-semibold transition-colors ${
            value === option.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
