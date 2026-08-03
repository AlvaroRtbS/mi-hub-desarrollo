import { SkeletonTabla, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-4 pt-16 md:p-8 max-w-6xl">
      <div className="space-y-2 mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <SkeletonTabla filas={7} />
    </div>
  );
}
