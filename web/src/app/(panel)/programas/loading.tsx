import { SkeletonTabla, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-4 pt-16 md:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <SkeletonTabla filas={6} />
    </div>
  );
}
