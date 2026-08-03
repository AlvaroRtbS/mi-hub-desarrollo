import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PreguntaForm } from "@/lib/formularios";
import { NuevoFormularioBtn } from "./nuevo-boton";

export default async function FormulariosCoachPage() {
  const supabase = await createSupabaseServerClient();

  const { data: formularios } = await supabase
    .from("formularios")
    .select("id, titulo, preguntas, actualizado_en")
    .order("actualizado_en", { ascending: false })
    .returns<
      { id: string; titulo: string; preguntas: PreguntaForm[]; actualizado_en: string }[]
    >();

  // Conteo de asignaciones por formulario (asignadas / completadas).
  const { data: asignaciones } = await supabase
    .from("formulario_asignaciones")
    .select("formulario_id, completado")
    .returns<{ formulario_id: string; completado: boolean }[]>();

  const conteo = new Map<string, { total: number; completadas: number }>();
  for (const a of asignaciones ?? []) {
    const c = conteo.get(a.formulario_id) ?? { total: 0, completadas: 0 };
    c.total += 1;
    if (a.completado) c.completadas += 1;
    conteo.set(a.formulario_id, c);
  }

  const lista = formularios ?? [];

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold">Formularios</h1>
        <NuevoFormularioBtn />
      </div>
      <p className="text-sm text-neutral-400 mb-6">
        Crea cuestionarios a medida y asígnalos a las clientas que quieras.
      </p>

      {lista.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-10 text-center">
          <FileText className="size-8 text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-400 mb-1">Aún no tienes formularios.</p>
          <p className="text-xs text-neutral-500">
            Crea uno para pedir información a tus clientas (objetivos, hábitos, lo que necesites).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((f) => {
            const c = conteo.get(f.id) ?? { total: 0, completadas: 0 };
            const nPreguntas = (f.preguntas ?? []).length;
            return (
              <Link
                key={f.id}
                href={`/formularios/${f.id}`}
                className="flex items-center gap-3 border border-neutral-800 rounded-xl p-4 hover:bg-neutral-900/50 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{f.titulo}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {nPreguntas} pregunta{nPreguntas === 1 ? "" : "s"}
                    {c.total > 0 && (
                      <> · {c.completadas}/{c.total} completado{c.total === 1 ? "" : "s"}</>
                    )}
                    {c.total === 0 && <> · sin asignar</>}
                  </div>
                </div>
                <ChevronRight className="size-5 text-neutral-600 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
