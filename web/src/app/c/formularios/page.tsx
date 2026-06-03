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

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Formularios</h1>
      <p className="text-sm text-neutral-400 mb-5">
        Cuestionarios que te pide tu entrenador. Rellénalos para que ajuste tu plan.
      </p>

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
    </div>
  );
}
