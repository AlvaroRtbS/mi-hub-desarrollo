/**
 * Skeletons reutilizables para placeholders de carga.
 * Usan animate-pulse de Tailwind.
 */

import { clasesCondicionales } from "@/lib/utilidades";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clasesCondicionales(
        "animate-pulse rounded-md bg-neutral-800/60",
        className
      )}
      aria-hidden="true"
    />
  );
}

/** Skeleton de varias líneas de texto. */
export function SkeletonTexto({ lineas = 3 }: { lineas?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lineas }).map((_, i) => (
        <Skeleton
          key={i}
          className={
            "h-3 " + (i === lineas - 1 ? "w-1/2" : i % 2 === 0 ? "w-full" : "w-4/5")
          }
        />
      ))}
    </div>
  );
}

/** Skeleton de una tarjeta tipo "fila" con avatar + texto. */
export function SkeletonFilaConAvatar() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}

/** Skeleton de una tabla con N filas. */
export function SkeletonTabla({ filas = 5 }: { filas?: number }) {
  return (
    <div className="border border-neutral-800 rounded-2xl overflow-hidden">
      <div className="bg-neutral-900 px-4 py-3">
        <Skeleton className="h-3 w-1/4" />
      </div>
      {Array.from({ length: filas }).map((_, i) => (
        <SkeletonFilaConAvatar key={i} />
      ))}
    </div>
  );
}

/** Skeleton tipo grid de cards (para biblioteca de ejercicios, etc.) */
export function SkeletonGrid({ items = 8 }: { items?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="border border-neutral-800 rounded-xl overflow-hidden"
        >
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
