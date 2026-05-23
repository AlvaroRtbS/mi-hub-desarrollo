import { SkeletonGrid, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-9 max-w-sm mb-3" />
      <div className="flex gap-1.5 mb-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      <SkeletonGrid items={12} />
    </div>
  );
}
