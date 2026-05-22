import type { EstadoClienta } from "@/lib/supabase/tipos";

const estilos: Record<EstadoClienta, string> = {
  activa: "bg-green-950/50 text-green-400 border-green-900/50",
  invitada: "bg-amber-950/50 text-amber-400 border-amber-900/50",
  archivada: "bg-neutral-900 text-neutral-500 border-neutral-800",
};

export function EtiquetaEstado({ estado }: { estado: EstadoClienta }) {
  return (
    <span
      className={
        "inline-block text-xs px-2 py-0.5 rounded-full border " + estilos[estado]
      }
    >
      {estado}
    </span>
  );
}
