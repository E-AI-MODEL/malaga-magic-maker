import { cn } from "@/lib/utils";

/** Crisp vector logo: orange slanted V-stroke + wordmark in current text color. */
export function BrandLogo({ className, onImage = false }: { className?: string; onImage?: boolean }) {
  return (
    <span role="img" aria-label="Vakansie" className={cn("inline-flex h-8 items-center font-display font-bold leading-none tracking-tight", onImage ? "text-on-image drop-shadow-md" : "text-foreground", className)}>
      <svg aria-hidden viewBox="0 0 40 48" className="h-full w-auto">
        <path d="M0 0h13l12 34L37 0h3L28 48H16z" fill="hsl(var(--primary))" />
      </svg>
      <span aria-hidden className="-ml-[0.32em] text-[1.9em] uppercase">akansie</span>
    </span>
  );
}
