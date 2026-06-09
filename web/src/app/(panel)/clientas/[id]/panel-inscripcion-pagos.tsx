import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GestorInscripcionPagos } from "./gestor-pagos";
import type { Inscripcion, Pago } from "@/lib/supabase/tipos";

/**
 * Carga la inscripción (activa o la más reciente) y los pagos de la clienta y
 * delega la UI interactiva en GestorInscripcionPagos. RLS limita al coach.
 */
export async function PanelInscripcionPagos({ clientaId }: { clientaId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("*")
    .eq("clienta_id", clientaId)
    .order("fecha_inicio", { ascending: false })
    .returns<Inscripcion[]>();

  const lista = inscripciones ?? [];
  const inscripcion = lista.find((i) => i.estado === "activa") ?? lista[0] ?? null;

  const { data: pagos } = await supabase
    .from("pagos")
    .select("*")
    .eq("clienta_id", clientaId)
    .order("fecha_vencimiento", { ascending: true, nullsFirst: false })
    .returns<Pago[]>();

  return (
    <GestorInscripcionPagos
      clientaId={clientaId}
      inscripcion={inscripcion}
      pagos={pagos ?? []}
    />
  );
}
