import type { EtapaClienta } from "@/lib/supabase/tipos";

const estilos: Record<EtapaClienta, string> = {
  lead: "bg-blue-950/50 text-blue-400 border-blue-900/50",
  activa: "bg-green-950/50 text-green-400 border-green-900/50",
  pausada: "bg-amber-950/50 text-amber-400 border-amber-900/50",
  baja: "bg-red-950/50 text-red-400 border-red-900/50",
  recuperable: "bg-purple-950/50 text-purple-300 border-purple-900/50",
};

const etiquetas: Record<EtapaClienta, string> = {
  lead: "Lead",
  activa: "Activa",
  pausada: "Pausada",
  baja: "Baja",
  recuperable: "Recuperable",
};

export function EtiquetaEtapa({ etapa }: { etapa: EtapaClienta | null }) {
  if (!etapa) return <span className="text-xs text-neutral-600">—</span>;
  return (
    <span
      className={
        "inline-block text-xs px-2 py-0.5 rounded-full border " + estilos[etapa]
      }
    >
      {etiquetas[etapa]}
    </span>
  );
}
