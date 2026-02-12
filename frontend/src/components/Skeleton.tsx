/**
 * Animated loading skeleton placeholders.
 */
export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-mist-dark/30 rounded-lg ${className}`} />
    );
}

/** Full card skeleton */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="bg-white rounded-card border border-mist-dark/30 p-5 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
            ))}
        </div>
    );
}

/** Grid of skeleton cards */
export function SkeletonGrid({ count = 6, lines = 2 }: { count?: number; lines?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <CardSkeleton key={i} lines={lines} />
            ))}
        </div>
    );
}

/** Table skeleton */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
    return (
        <div className="bg-white rounded-card border border-mist-dark/30 overflow-hidden">
            <div className="flex gap-4 p-3 bg-mist/30">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-3 flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex gap-4 p-3 border-t border-mist-dark/20">
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} className="h-3 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}
