import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Vista del coach del formulario de onboarding de una clienta.
 * El onboarding es ahora una plantilla genérica (es_onboarding) asignada a la
 * clienta, así que reutilizamos la vista genérica de respuestas
 * (/formularios/[id]/r/[asignacionId]). Si no hay asignación, avisamos.
 */
export default async function FormularioClientaCoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientaId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre")
    .eq("id", clientaId)
    .maybeSingle<{ id: string; nombre: string }>();
  if (!clienta) notFound();

  const { data: onboarding } = await supabase
    .from("formularios")
    .select("id")
    .eq("es_onboarding", true)
    .maybeSingle<{ id: string }>();

  if (onboarding) {
    const { data: asignacion } = await supabase
      .from("formulario_asignaciones")
      .select("id")
      .eq("formulario_id", onboarding.id)
      .eq("clienta_id", clientaId)
      .maybeSingle<{ id: string }>();
    if (asignacion) {
      redirect(`/formularios/${onboarding.id}/r/${asignacion.id}`);
    }
  }

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-2xl">
      <Link
        href={`/clientas/${clientaId}`}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a {clienta.nombre}
      </Link>
      <h1 className="text-2xl font-semibold mt-3 mb-1">Valoración inicial</h1>
      <p className="text-sm text-neutral-400 mb-6">
        {onboarding
          ? `${clienta.nombre} todavía no tiene asignada la valoración inicial.`
          : "Marca una plantilla como formulario de onboarding en /formularios para usar esta vista."}
      </p>
      <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
        Sin respuestas todavía.
      </div>
    </div>
  );
}
