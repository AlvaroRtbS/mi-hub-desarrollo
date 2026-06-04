import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Formulario, PreguntaForm } from "@/lib/formularios";
import { FormularioGenerico } from "./formulario-generico";

export default async function RellenarFormularioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // La asignación es de la clienta (RLS garantiza que solo ve las suyas).
  const { data: asignacion } = await supabase
    .from("formulario_asignaciones")
    .select(
      "id, respuestas, completado, formularios(id, titulo, descripcion, preguntas)"
    )
    .eq("id", id)
    .maybeSingle<{
      id: string;
      respuestas: Record<string, string | string[]>;
      completado: boolean;
      formularios: {
        id: string;
        titulo: string;
        descripcion: string | null;
        preguntas: PreguntaForm[];
      } | null;
    }>();

  if (!asignacion || !asignacion.formularios) notFound();

  const formulario: Formulario = {
    id: asignacion.formularios.id,
    titulo: asignacion.formularios.titulo,
    descripcion: asignacion.formularios.descripcion,
    preguntas: asignacion.formularios.preguntas ?? [],
  };

  return (
    <div>
      <Link
        href="/c/formularios"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> Formularios
      </Link>

      <h1 className="text-xl font-semibold mb-1">{formulario.titulo}</h1>
      {formulario.descripcion && (
        <p className="text-sm text-neutral-400 mb-5">{formulario.descripcion}</p>
      )}

      <FormularioGenerico
        asignacionId={asignacion.id}
        formulario={formulario}
        respuestasIniciales={asignacion.respuestas ?? {}}
        yaCompletado={asignacion.completado}
      />
    </div>
  );
}
