import heroDefault from "@/assets/hero-transport.jpg";

/**
 * Shared cover/fallback art direction for a trip.
 * A stored cover_image_url always wins. Without one we show one neutral local
 * atmosphere image, never an external or destination-specific stand-in.
 */
export function TripVisual({
  name,
  coverImageUrl,
  height = "h-[150px] sm:h-[190px]",
  rounded = "rounded-[18px]",
  overlay = true,
  className = "",
  children,
}: {
  name: string;
  coverImageUrl?: string | null;
  height?: string;
  rounded?: string;
  overlay?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const isFallback = !coverImageUrl;
  const src = coverImageUrl || heroDefault;

  return (
    <div className={`relative overflow-hidden ${rounded} ${height} bg-secondary ${className}`}>
      <img
        src={src}
        alt={isFallback ? "Sfeerbeeld voor je reis" : `Omslagfoto van ${name}`}
        width={1280}
        height={720}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {overlay && (
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/45 via-foreground/5 to-transparent" />
      )}
      {children && <div className="absolute inset-x-0 bottom-0 p-4">{children}</div>}
    </div>
  );
}
