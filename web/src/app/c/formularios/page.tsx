import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FORMULARIO_INICIAL, FORMULARIO_INICIAL_TIPO } from "@/lib/formulario-inicial";
import { formatearFecha } from "@/lib/utilidades";

export default async function FormulariosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return null;

  const { data: fila } = await supabase
    .from("formulario_respuestas")
    .select("completado, completado_en")
    .eq("clienta_id", clienta.id)
    .eq("tipo", FORMULARIO_INICIAL_TIPO)
    .maybeSingle<{ completado: boolean; completado_en: string | null }>();

  const completado = fila?.completado ?? false;

  // Formularios genéricos asignados por el coach (RLS limita a los suyos).
  const { data: asignaciones } = await supabase
    .from("formulario_asignaciones")
    .select("id, completado, completado_en, formularios(titulo)")
    .eq("clienta_id", clienta.id)
    .order("creado_en", { ascending: false })
    .returns<
      {
        id: string;
        completado: boolean;
        completado_en: string | null;
        formularios: { titulo: string } | null;
      }[]
    >();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Formularios</h1>
      <p className="text-sm text-neutral-400 mb-5">
        Cuestionarios que te pide tu entrenador. Rellénalos para que ajuste tu plan.
      </p>

      <div className="space-y-3">
        <Link
          href="/c/formularios/inicial"
          className="flex items-center gap-3 border border-neutral-800 rounded-2xl p-4 hover:bg-neutral-900/50 transition"
        >
          <div className="text-2xl">📋</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{FORMULARIO_INICIAL.titulo}</div>
            <div className="text-xs mt-0.5">
              {completado ? (
                <span className="text-emerald-400">
                  ✓ Completado{fila?.completado_en ? ` · ${formatearFecha(fila.completado_en)}` : ""}
                </span>
              ) : (
                <span className="text-amber-400">Pendiente de rellenar</span>
              )}
            </div>
          </div>
          <ChevronRight className="size-5 text-neutral-600 shrink-0" />
        </Link>

        {(asignaciones ?? []).map((a) => (
          <Link
            key={a.id}
            href={`/c/formularios/${a.id}`}
            className="flex items-center gap-3 border border-neutral-800 rounded-2xl p-4 hover:bg-neutral-900/50 transition"
          >
            <div className="text-2xl">📝</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {a.formularios?.titulo ?? "Formulario"}
              </div>
              <div className="text-xs mt-0.5">
                {a.completado ? (
                  <span className="text-emerald-400">
                    ✓ Completado{a.completado_en ? ` · ${formatearFecha(a.completado_en)}` : ""}
                  </span>
                ) : (
                  <span className="text-amber-400">Pendiente de rellenar</span>
                )}
              </div>
            </div>
            <ChevronRight className="size-5 text-neutral-600 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
