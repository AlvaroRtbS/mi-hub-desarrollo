import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatearFecha, hoyISO } from "@/lib/utilidades";

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

  // Formularios asignados por el coach (RLS limita a los suyos). El onboarding
  // es uno más (plantilla es_onboarding), lo mostramos el primero.
  const { data: asignacionesRaw } = await supabase
    .from("formulario_asignaciones")
    .select(
      "id, completado, completado_en, disponible_desde, formularios(titulo, es_onboarding)"
    )
    .eq("clienta_id", clienta.id)
    .order("creado_en", { ascending: false })
    .returns<
      {
        id: string;
        completado: boolean;
        completado_en: string | null;
        disponible_desde: string | null;
        formularios: { titulo: string; es_onboarding: boolean } | null;
      }[]
    >();

  const hoy = hoyISO();
  const asignaciones = [...(asignacionesRaw ?? [])].sort(
    (a, b) =>
      Number(b.formularios?.es_onboarding ?? false) -
      Number(a.formularios?.es_onboarding ?? false)
  );

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Formularios</h1>
      <p className="text-sm text-neutral-400 mb-5">
        Cuestionarios que te pide tu entrenador. Rellénalos para que ajuste tu plan.
      </p>

      <div className="space-y-3">
        {asignaciones.length === 0 && (
          <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
            Tu entrenador aún no te ha asignado ningún formulario.
          </div>
        )}

        {asignaciones.map((a) => {
          const bloqueado =
            !a.completado && !!a.disponible_desde && a.disponible_desde > hoy;
          const icono = a.formularios?.es_onboarding ? "📋" : "📝";
          const cuerpo = (
            <>
              <div className="text-2xl">{bloqueado ? "🔒" : icono}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {a.formularios?.titulo ?? "Formulario"}
                </div>
                <div className="text-xs mt-0.5">
                  {a.completado ? (
                    <span className="text-emerald-400">
                      ✓ Completado{a.completado_en ? ` · ${formatearFecha(a.completado_en)}` : ""}
                    </span>
                  ) : bloqueado ? (
                    <span className="text-neutral-500">
                      Disponible el {formatearFecha(a.disponible_desde!)}
                    </span>
                  ) : (
                    <span className="text-amber-400">Pendiente de rellenar</span>
                  )}
                </div>
              </div>
              {!bloqueado && (
                <ChevronRight className="size-5 text-neutral-600 shrink-0" />
              )}
            </>
          );
          return bloqueado ? (
            <div
              key={a.id}
              className="flex items-center gap-3 border border-neutral-800 rounded-2xl p-4 opacity-60"
            >
              {cuerpo}
            </div>
          ) : (
            <Link
              key={a.id}
              href={`/c/formularios/${a.id}`}
              className="flex items-center gap-3 border border-neutral-800 rounded-2xl p-4 hover:bg-neutral-900/50 transition"
            >
              {cuerpo}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
