import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  FORMULARIO_INICIAL,
  FORMULARIO_INICIAL_TIPO,
} from "@/lib/formulario-inicial";
import { formatearFecha } from "@/lib/utilidades";

export default async function FormularioClientaCoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientaId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .eq("id", clientaId)
    .maybeSingle<{ id: string; nombre: string; apellidos: string | null }>();
  if (!clienta) notFound();

  const { data: fila } = await supabase
    .from("formulario_respuestas")
    .select("respuestas, completado, completado_en")
    .eq("clienta_id", clientaId)
    .eq("tipo", FORMULARIO_INICIAL_TIPO)
    .maybeSingle<{
      respuestas: Record<string, string> | null;
      completado: boolean;
      completado_en: string | null;
    }>();

  const respuestas = fila?.respuestas ?? {};
  const tieneAlguna = Object.values(respuestas).some(
    (v) => v != null && String(v).trim() !== ""
  );

  return (
    <div className="p-8 mx-auto max-w-2xl">
      <Link
        href={`/clientas/${clientaId}`}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a {clienta.nombre}
      </Link>
      <h1 className="text-2xl font-semibold mt-3 mb-1">
        {FORMULARIO_INICIAL.titulo}
      </h1>
      <p className="text-sm text-neutral-400 mb-6">
        Respuestas de {clienta.nombre} {clienta.apellidos ?? ""}.{" "}
        {fila ? (
          fila.completado ? (
            <span className="text-emerald-400">
              Completado
              {fila.completado_en
                ? ` · ${formatearFecha(fila.completado_en)}`
                : ""}
            </span>
          ) : (
            <span className="text-amber-400">Empezado, sin enviar</span>
          )
        ) : (
          <span className="text-neutral-500">Aún no lo ha rellenado.</span>
        )}
      </p>

      {!tieneAlguna ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          {clienta.nombre} todavía no ha rellenado el formulario inicial.
        </div>
      ) : (
        <div className="space-y-3">
          {FORMULARIO_INICIAL.preguntas.map((p) => {
            const valor = (respuestas[p.id] ?? "").toString().trim();
            return (
              <div
                key={p.id}
                className="border border-neutral-800 rounded-xl p-4"
              >
                <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
                  {p.label}
                </div>
                {valor ? (
                  <div className="text-sm whitespace-pre-wrap">
                    {valor}
                    {p.sufijo ? ` ${p.sufijo}` : ""}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-600">— sin responder</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
