import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Sparkles, X, type LucideIcon } from "lucide-react";

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
  className = "",
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ id: T; label: string }>;
  className?: string;
}) {
  return (
    <div role="tablist" className={`flex w-full rounded-[14px] border border-border bg-secondary/70 p-1 ${className}`}>
      {options.map((option) => (
        <button
          key={option.id}
          role="tab"
          type="button"
          aria-selected={value === option.id}
          onClick={() => onChange(option.id)}
          className={`min-h-[40px] flex-1 rounded-[10px] px-2 text-[13px] font-semibold transition-colors ${
            value === option.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Sticky working bar. Holds the segmented menu or filter chips of a page so the
 * menu stays reachable while the dense list scrolls underneath it.
 */
export function StickyBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`sticky top-12 z-30 -mx-5 border-b border-rule bg-background/95 px-5 py-2 sm:-mx-8 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

/** Horizontal filter chips. Scrolls sideways on small screens. */
export function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ id: T; label: string; count?: number }>;
}) {
  return (
    <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 font-ui text-[13px] font-medium transition-colors ${
              selected ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span className={`num text-[11px] ${selected ? "text-background/70" : "text-muted-foreground/70"}`}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Inline counts that double as navigation. Replaces KPI card grids. */
export function CountBar({
  items,
  className = "",
}: {
  items: Array<{ label: string; value: ReactNode; to?: string; onClick?: () => void }>;
  className?: string;
}) {
  return (
    <div className={`flex items-stretch ${className}`}>
      {items.map((item, index) => {
        const body = (
          <>
            <span className="num block text-[19px] font-semibold leading-none">{item.value}</span>
            <span className="mt-1 block truncate text-[11px] text-muted-foreground">{item.label}</span>
          </>
        );
        const shared = `min-w-0 flex-1 px-2 py-1 text-left first:pl-0 ${index > 0 ? "border-l border-rule" : ""}`;
        if (item.to) {
          return (
            <Link key={item.label} to={item.to} className={`${shared} transition-opacity hover:opacity-70`}>
              {body}
            </Link>
          );
        }
        if (item.onClick) {
          return (
            <button key={item.label} type="button" onClick={item.onClick} className={`${shared} transition-opacity hover:opacity-70`}>
              {body}
            </button>
          );
        }
        return <span key={item.label} className={shared}>{body}</span>;
      })}
    </div>
  );
}

/** Sticky day header for the itinerary. Small, quiet, always visible while scrolling. */
export function DayHeader({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="sticky top-[5.5rem] z-20 -mx-5 flex items-baseline gap-2 bg-background/95 px-5 py-1.5 sm:-mx-8 sm:px-8">
      <span className="font-ui text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground">{label}</span>
      {meta && <span className="num truncate text-[11px] text-muted-foreground">{meta}</span>}
    </div>
  );
}

/** Hansie proposes something inside the list itself. Never a chat bubble. */
export function SuggestionRow({
  title,
  meta,
  actionLabel = "Toevoegen",
  onAccept,
  onDismiss,
}: {
  title: string;
  meta?: string;
  actionLabel?: string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-l-2 border-primary py-3 pl-3">
      <Sparkles className="h-[17px] w-[17px] shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium leading-tight">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">Hansie{meta ? ` · ${meta}` : ""}</span>
      </span>
      <button
        type="button"
        onClick={onAccept}
        className="h-9 shrink-0 rounded-full bg-foreground px-3 font-ui text-[12px] font-semibold text-background"
      >
        {actionLabel}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Suggestie negeren"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

export type SwipeAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: "default" | "danger";
};

/**
 * Row with trailing swipe actions. Rows stay clean until you drag them left;
 * on pointer devices the same actions appear on hover.
 */
export function SwipeRow({ children, actions }: { children: ReactNode; actions: SwipeAction[] }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const width = actions.length * 64;

  if (actions.length === 0) return <>{children}</>;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    startX.current = event.clientX;
    startOffset.current = offset;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    setOffset(Math.min(0, Math.max(-width, startOffset.current + delta)));
  };

  const onPointerUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    setOffset((current) => (current < -width / 2 ? -width : 0));
  };

  return (
    <div className="group relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            aria-label={action.label}
            onClick={() => {
              setOffset(0);
              action.onClick();
            }}
            className={`flex w-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-opacity ${
              action.tone === "danger" ? "text-destructive" : "text-muted-foreground"
            } ${offset === 0 ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
          >
            <action.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {action.label}
          </button>
        ))}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${offset}px)` }}
        className="relative bg-background transition-transform duration-150 group-hover:pr-16"
      >
        {children}
      </div>
    </div>
  );
}
