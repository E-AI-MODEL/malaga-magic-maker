import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      {/* Content skeletons */}
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="bg-foreground px-6 py-10 space-y-3">
      <Skeleton className="h-3 w-24 bg-white/10" />
      <Skeleton className="h-7 w-56 bg-white/10" />
      <Skeleton className="h-4 w-40 bg-white/10" />
    </div>
  );
}

/** Inline loading skeleton that matches accordion card height */
export function AccordionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 px-6 py-6">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}
