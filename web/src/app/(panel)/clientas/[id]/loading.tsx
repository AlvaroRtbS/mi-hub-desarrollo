import { Skeleton, SkeletonTexto } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-4 pt-16 md:p-8 max-w-5xl">
      <Skeleton className="h-3 w-16 mb-4" />
      {/* Cabecera */}
      <div className="flex items-start gap-4 mb-6">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-neutral-800 rounded-2xl p-4 space-y-2"
          >
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        ))}
      </div>
      {/* Tabs */}
      <div className="border-b border-neutral-800 flex gap-1 pb-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20" />
        ))}
      </div>
      {/* Contenido */}
      <div className="space-y-4">
        <div className="border border-neutral-800 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <SkeletonTexto lineas={3} />
        </div>
        <div className="border border-neutral-800 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <SkeletonTexto lineas={2} />
        </div>
      </div>
    </div>
  );
}
