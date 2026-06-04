import { Skeleton } from "@/components/ui/skeleton";

/**
 * Estado de carga del portal de la clienta. Se renderiza DENTRO del marco
 * (header + tab-bar siguen visibles) mientras la pantalla destino carga sus
 * datos. Cubre todas las subrutas de /c que no definan su propio loading.
 */
export default function CargandoPortal() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-3 gap-2 mt-1">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
