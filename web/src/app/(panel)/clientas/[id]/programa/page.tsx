import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EstructuraPrograma } from "@/lib/supabase/tipos";
import { EditorAsignacionCliente } from "./editor";
import { calcularHistorialEjercicio } from "./historial";

export default async function ProgramaClientaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientaId } = await params;
  const supabase = await createSupabaseServerClient();

  // Datos clienta
  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .eq("id", clientaId)
    .maybeSingle();

  if (!clienta) notFound();

  // Asignación activa
  const { data: asignacion } = await supabase
    .from("asignaciones")
    .select(
      "id, fecha_inicio, fecha_fin, estructura_snapshot, programas(id, nombre)"
    )
    .eq("clienta_id", clientaId)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!asignacion) {
    return (
      <div className="p-8 max-w-3xl">
        <Link
          href={`/clientas/${clientaId}`}
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-semibold mt-4 mb-2">Programa asignado</h1>
        <p className="text-sm text-neutral-400">
          {clienta.nombre} aún no tiene un programa activo. Asígnale uno desde
          la página de programas.
        </p>
      </div>
    );
  }

  const asign = asignacion as unknown as {
    id: string;
    fecha_inicio: string;
    fecha_fin: string | null;
    estructura_snapshot: EstructuraPrograma;
    programas: { id: string; nombre: string } | null;
  };

  // Cargar todas las sesiones de la clienta para calcular historial por
  // ejercicio (las usamos en sugerencias de progresión).
  const { data: sesionesData } = await supabase
    .from("sesiones")
    .select("fecha, completada, porcentaje_completado, registros")
    .eq("clienta_id", clientaId)
    .order("fecha", { ascending: false });

  const sesiones = (sesionesData ?? []) as Array<{
    fecha: string;
    completada: boolean;
    porcentaje_completado: number;
    registros: Record<string, unknown> | null;
  }>;

  // Recopilar todos los ejercicio_id presentes en la estructura
  const ejercicioIds = new Set<string>();
  for (const sem of asign.estructura_snapshot ?? []) {
    for (const dia of sem.dias) {
      for (const bloque of dia.bloques) {
        for (const el of bloque.elementos) {
          if (el.tipo === "ejercicio") ejercicioIds.add(el.ejercicio_id);
        }
      }
    }
  }

  // Buscar info de los ejercicios (para detectar si usan peso libre o no)
  const { data: ejerciciosData } = await supabase
    .from("ejercicios")
    .select("id, nombre, material")
    .in("id", Array.from(ejercicioIds));

  const ejerciciosInfo = new Map<
    string,
    { nombre: string; material: string[] }
  >();
  for (const e of (ejerciciosData ?? []) as Array<{
    id: string;
    nombre: string;
    material: string[];
  }>) {
    ejerciciosInfo.set(e.id, {
      nombre: e.nombre,
      material: e.material ?? [],
    });
  }

  // Pre-calcular historial por ejercicio (cacheado para el componente)
  const historiales = new Map<
    string,
    ReturnType<typeof calcularHistorialEjercicio>
  >();
  for (const ejId of ejercicioIds) {
    historiales.set(ejId, calcularHistorialEjercicio(ejId, sesiones));
  }

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href={`/clientas/${clientaId}`}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a {clienta.nombre}
      </Link>
      <div className="flex items-baseline justify-between gap-4 mt-3 mb-1 flex-wrap">
        <h1 className="text-2xl font-semibold">
          Plan de {clienta.nombre}{" "}
          <span className="text-neutral-500 font-normal text-base">
            · {asign.programas?.nombre}
          </span>
        </h1>
      </div>
      <p className="text-sm text-neutral-400 mb-6">
        Ajusta el plan específicamente para esta clienta. Los cambios{" "}
        <strong>no afectan al programa base</strong> ni a otras clientas con el
        mismo programa asignado. Verás sugerencias de progresión basadas en su
        historial.
      </p>

      <EditorAsignacionCliente
        asignacionId={asign.id}
        estructuraInicial={asign.estructura_snapshot ?? []}
        ejerciciosInfo={Object.fromEntries(ejerciciosInfo)}
        historiales={Object.fromEntries(historiales)}
      />
    </div>
  );
}
