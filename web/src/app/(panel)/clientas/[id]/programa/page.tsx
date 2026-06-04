import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
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
      "id, fecha_inicio, fecha_fin, programa_id, estructura_snapshot, programas(id, nombre)"
    )
    .eq("clienta_id", clientaId)
    .eq("activa", true)
    .order("creada_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!asignacion) {
    return (
      <div className="p-8 mx-auto max-w-3xl">
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
    programa_id: string;
    estructura_snapshot: EstructuraPrograma;
    programas: { id: string; nombre: string } | null;
  };

  // Cargar la estructura del programa BASE para detectar qué ejercicios
  // de la asignación se han personalizado respecto a la plantilla.
  const { data: programaBase } = await supabase
    .from("programas")
    .select("estructura")
    .eq("id", asign.programa_id)
    .maybeSingle();
  const estructuraBase = (programaBase?.estructura ??
    []) as EstructuraPrograma;

  // Compara cada elemento del snapshot con su equivalente en base por id.
  // Devuelve Set con los ids de elementos que difieren (= personalizados).
  const idsModificados = new Set<string>();
  const ejerciciosBaseById = new Map<string, unknown>();
  for (const sem of estructuraBase) {
    for (const dia of sem.dias ?? []) {
      for (const bloque of dia.bloques ?? []) {
        for (const el of bloque.elementos ?? []) {
          ejerciciosBaseById.set(el.id, el);
        }
      }
    }
  }
  for (const sem of asign.estructura_snapshot ?? []) {
    for (const dia of sem.dias ?? []) {
      for (const bloque of dia.bloques ?? []) {
        for (const el of bloque.elementos ?? []) {
          const base = ejerciciosBaseById.get(el.id);
          if (!base) {
            // No está en el base → fue añadido por la coach
            idsModificados.add(el.id);
          } else if (JSON.stringify(base) !== JSON.stringify(el)) {
            idsModificados.add(el.id);
          }
        }
      }
    }
  }

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
    for (const dia of sem.dias ?? []) {
      for (const bloque of dia.bloques ?? []) {
        for (const el of bloque.elementos ?? []) {
          if (el.tipo === "ejercicio") ejercicioIds.add(el.ejercicio_id);
        }
      }
    }
  }

  // Info de los ejercicios actualmente usados — incluye instrucciones,
  // URLs firmadas de vídeo/imagen y material (para sugerencias + previsualización).
  const { data: ejerciciosData } = await supabase
    .from("ejercicios")
    .select("id, nombre, instrucciones, video_url, imagen_url, material")
    .in("id", Array.from(ejercicioIds));

  const ejerciciosArr = (ejerciciosData ?? []) as Array<{
    id: string;
    nombre: string;
    instrucciones: string | null;
    video_url: string | null;
    imagen_url: string | null;
    material: string[];
  }>;

  const [urlsVideo, urlsImagen] = await Promise.all([
    obtenerUrlsFirmadas(
      "ejercicios-videos",
      ejerciciosArr.map((e) => e.video_url),
      3600
    ),
    obtenerUrlsFirmadas(
      "ejercicios-imagenes",
      ejerciciosArr.map((e) => e.imagen_url),
      3600
    ),
  ]);

  const ejerciciosInfo = new Map<
    string,
    {
      nombre: string;
      instrucciones: string | null;
      videoUrl: string | null;
      imagenUrl: string | null;
      material: string[];
    }
  >();
  for (const e of ejerciciosArr) {
    ejerciciosInfo.set(e.id, {
      nombre: e.nombre,
      instrucciones: e.instrucciones,
      videoUrl: e.video_url ? urlsVideo.get(e.video_url) ?? null : null,
      imagenUrl: e.imagen_url ? urlsImagen.get(e.imagen_url) ?? null : null,
      material: e.material ?? [],
    });
  }

  // Biblioteca completa de ejercicios disponibles para añadir desde el editor
  const { data: bibliotecaData } = await supabase
    .from("ejercicios")
    .select("id, nombre, grupos_musculares, material")
    .order("nombre");
  const biblioteca = (bibliotecaData ?? []) as Array<{
    id: string;
    nombre: string;
    grupos_musculares: string[];
    material: string[];
  }>;

  // Pre-calcular historial por ejercicio (cacheado para el componente)
  const historiales = new Map<
    string,
    ReturnType<typeof calcularHistorialEjercicio>
  >();
  for (const ejId of ejercicioIds) {
    historiales.set(ejId, calcularHistorialEjercicio(ejId, sesiones));
  }

  return (
    <div className="p-8 mx-auto max-w-5xl">
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
        biblioteca={biblioteca}
        idsModificadosBase={Array.from(idsModificados)}
      />
    </div>
  );
}
