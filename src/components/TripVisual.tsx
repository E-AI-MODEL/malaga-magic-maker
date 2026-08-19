import type { ReactNode } from "react";
import heroBeachTown from "@/assets/hero-beach-town.jpg";
import heroVilla from "@/assets/hero-villa.jpg";
import heroTransport from "@/assets/hero-transport.jpg";

const fallbackPool = [heroBeachTown, heroVilla, heroTransport];

function stableIndex(seed: string, buckets: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash % buckets;
}

export function tripVisualSource({ name, coverImageUrl }: { name: string; coverImageUrl?: string | null }) {
  const isFallback = !coverImageUrl;
  return {
    src: coverImageUrl || fallbackPool[stableIndex(name || "vakansie", fallbackPool.length)],
    isFallback,
  };
}

/**
 * Shared trip photography. A stored cover image always wins. Without one we
 * use deterministic local travel photography, never a destination-specific
 * external stand-in.
 */
export function TripVisual({
  name,
  coverImageUrl,
  height = "h-[160px] sm:h-[200px]",
  rounded = "rounded-[18px]",
  overlay = false,
  className = "",
  children,
}: {
  name: string;
  coverImageUrl?: string | null;
  height?: string;
  rounded?: string;
  overlay?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const visual = tripVisualSource({ name, coverImageUrl });

  return (
    <div className={`relative isolate overflow-hidden bg-secondary ${rounded} ${height} ${className}`}>
      <img
        src={visual.src}
        alt={visual.isFallback ? "Algemeen reisbeeld" : `Omslagfoto van ${name}`}
        width={1280}
        height={720}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {overlay && <div aria-hidden className="absolute inset-0 bg-foreground/25" />}
      {visual.isFallback && (
        <span className="absolute right-3 top-3 rounded-full bg-card px-2.5 py-1 font-ui text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground shadow-soft">
          Sfeerbeeld
        </span>
      )}
      {children && <div className="absolute inset-x-0 bottom-0 p-4">{children}</div>}
    </div>
  );
}

export function TripThumb({
  name,
  coverImageUrl,
  className = "",
}: {
  name: string;
  coverImageUrl?: string | null;
  className?: string;
}) {
  const visual = tripVisualSource({ name, coverImageUrl });

  return (
    <span className={`block h-11 w-11 shrink-0 overflow-hidden rounded-[12px] bg-secondary ${className}`} aria-hidden>
      <img src={visual.src} alt="" loading="lazy" className="h-full w-full object-cover" />
    </span>
  );
}
