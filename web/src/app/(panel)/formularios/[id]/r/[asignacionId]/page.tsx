import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PreguntaForm } from "@/lib/formularios";
import { formatearFecha } from "@/lib/utilidades";

export default async function RespuestasPage({
  params,
}: {
  params: Promise<{ id: string; asignacionId: string }>;
}) {
  const { id, asignacionId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: asignacion } = await supabase
    .from("formulario_asignaciones")
    .select(
      "id, respuestas, completado, completado_en, clientas(nombre, apellidos), formularios(titulo, preguntas)"
    )
    .eq("id", asignacionId)
    .maybeSingle<{
      id: string;
      respuestas: Record<string, string | string[]>;
      completado: boolean;
      completado_en: string | null;
      clientas: { nombre: string; apellidos: string | null } | null;
      formularios: { titulo: string; preguntas: PreguntaForm[] } | null;
    }>();

  if (!asignacion || !asignacion.formularios) notFound();

  const preguntas = asignacion.formularios.preguntas ?? [];
  const respuestas = asignacion.respuestas ?? {};
  const nombre = asignacion.clientas
    ? `${asignacion.clientas.nombre} ${asignacion.clientas.apellidos ?? ""}`.trim()
    : "Clienta";

  return (
    <div className="p-8 mx-auto max-w-3xl">
      <Link
        href={`/formularios/${id}`}
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> {asignacion.formularios.titulo}
      </Link>

      <h1 className="text-2xl font-semibold mb-1">{nombre}</h1>
      <p className="text-sm mb-6">
        {asignacion.completado ? (
          <span className="text-emerald-400">
            Completado
            {asignacion.completado_en ? ` · ${formatearFecha(asignacion.completado_en)}` : ""}
          </span>
        ) : (
          <span className="text-amber-400">Aún no lo ha enviado</span>
        )}
      </p>

      <div className="space-y-4">
        {preguntas.map((p) => {
          const valor = respuestas[p.id];
          const texto = Array.isArray(valor) ? valor.join(", ") : (valor ?? "");
          const vacia = texto === "" || texto == null;
          return (
            <div key={p.id} className="border border-neutral-800 rounded-xl p-4">
              <div className="text-sm text-neutral-400 mb-1">{p.label}</div>
              <div className={`text-sm ${vacia ? "text-neutral-600 italic" : "text-neutral-100 whitespace-pre-wrap"}`}>
                {vacia ? "Sin responder" : texto}
                {!vacia && p.sufijo ? ` ${p.sufijo}` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
