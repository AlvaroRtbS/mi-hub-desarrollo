import { SkeletonTabla, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-4 pt-16 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-24" />
      </div>
      <SkeletonTabla filas={6} />
    </div>
  );
}
