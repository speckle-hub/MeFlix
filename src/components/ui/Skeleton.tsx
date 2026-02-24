export default function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-2xl bg-surface-hover ${className}`} />
    );
}

export function MediaCardSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="aspect-[2/3] w-full" />
            <div className="space-y-2 px-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    );
}

export function ContentGridSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <MediaCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}
