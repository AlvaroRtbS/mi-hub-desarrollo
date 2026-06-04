import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PreguntaForm } from "@/lib/formularios";
import { Constructor } from "./constructor";

export default async function FormularioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: formulario } = await supabase
    .from("formularios")
    .select("id, titulo, descripcion, preguntas")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      titulo: string;
      descripcion: string | null;
      preguntas: PreguntaForm[];
    }>();

  if (!formulario) notFound();

  const { data: clientas } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .order("nombre", { ascending: true })
    .returns<{ id: string; nombre: string; apellidos: string | null }[]>();

  const { data: asignaciones } = await supabase
    .from("formulario_asignaciones")
    .select("id, clienta_id, completado, completado_en")
    .eq("formulario_id", id)
    .returns<
      { id: string; clienta_id: string; completado: boolean; completado_en: string | null }[]
    >();

  return (
    <div className="p-8 mx-auto max-w-3xl">
      <Link
        href="/formularios"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> Formularios
      </Link>

      <Constructor
        formularioId={formulario.id}
        tituloInicial={formulario.titulo}
        descripcionInicial={formulario.descripcion ?? ""}
        preguntasIniciales={formulario.preguntas ?? []}
        clientas={clientas ?? []}
        asignaciones={asignaciones ?? []}
      />
    </div>
  );
}
