import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  EstructuraPrograma,
  ElementoEjercicio,
} from "@/lib/supabase/tipos";

type EjercicioUsado = {
  ejercicio_id: string;
  nombre: string;
  imagenPath: string | null;
  apariciones: number;
  ultimaFecha: string | null;
};

function fechaProgramada(inicio: string, semana: number, dia: number): string {
  const d = new Date(inicio + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + (semana - 1) * 7 + (dia - 1));
  return d.toISOString().slice(0, 10);
}

export default async function EjerciciosClientaPage({
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
    .maybeSingle();
  if (!clienta) notFound();

  const { data: asignacionesData } = await supabase
    .from("asignaciones")
    .select("id, programa_id, fecha_inicio, estructura_snapshot")
    .eq("clienta_id", clientaId)
    .order("creada_en", { ascending: false });

  const asignaciones = (asignacionesData ?? []) as unknown as Array<{
    id: string;
    programa_id: string;
    fecha_inicio: string;
    estructura_snapshot: EstructuraPrograma;
  }>;

  // Mapa ejercicio_id → { apariciones, ultimaFecha, nombre }
  const porEjercicio = new Map<
    string,
    { nombre: string; apariciones: number; ultimaFecha: string | null }
  >();

  for (const a of asignaciones) {
    for (const sem of a.estructura_snapshot ?? []) {
      for (const dia of sem.dias) {
        const fecha = fechaProgramada(a.fecha_inicio, sem.semana, dia.dia);
        for (const bloque of dia.bloques) {
          for (const elemento of bloque.elementos) {
            if (elemento.tipo === "ejercicio") {
              const ej = elemento as ElementoEjercicio;
              const entry = porEjercicio.get(ej.ejercicio_id) ?? {
                nombre: ej.ejercicio_nombre ?? "Ejercicio",
                apariciones: 0,
                ultimaFecha: null as string | null,
              };
              entry.apariciones += 1;
              if (!entry.ultimaFecha || fecha > entry.ultimaFecha) {
                entry.ultimaFecha = fecha;
              }
              porEjercicio.set(ej.ejercicio_id, entry);
            }
          }
        }
      }
    }
  }

  const ejercicioIds = Array.from(porEjercicio.keys());
  // Cargar metadatos (incluida imagen) de los ejercicios
  const { data: metaEjercicios } = await supabase
    .from("ejercicios")
    .select("id, nombre, imagen_url")
    .in("id", ejercicioIds.length > 0 ? ejercicioIds : ["__none__"]);

  const metaPorId = new Map(
    (metaEjercicios ?? []).map((m) => [
      (m as { id: string }).id,
      m as { id: string; nombre: string; imagen_url: string | null },
    ])
  );

  const lista: EjercicioUsado[] = ejercicioIds.map((id) => {
    const entry = porEjercicio.get(id)!;
    const meta = metaPorId.get(id);
    return {
      ejercicio_id: id,
      nombre: meta?.nombre ?? entry.nombre,
      imagenPath: meta?.imagen_url ?? null,
      apariciones: entry.apariciones,
      ultimaFecha: entry.ultimaFecha,
    };
  });

  // Orden: más recientemente programados primero
  lista.sort((a, b) => {
    if (!a.ultimaFecha && !b.ultimaFecha) return 0;
    if (!a.ultimaFecha) return 1;
    if (!b.ultimaFecha) return -1;
    return a.ultimaFecha < b.ultimaFecha ? 1 : -1;
  });

  const imagenes = await obtenerUrlsFirmadas(
    "ejercicios-imagenes",
    lista.map((l) => l.imagenPath),
    3600
  );

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href={`/clientas/${clientaId}`}
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a {clienta.nombre}
      </Link>

      <h1 className="text-2xl font-semibold mt-4">Ejercicios programados</h1>
      <p className="text-sm text-neutral-400 mt-1 mb-6">
        Ejercicios que aparecen en los programas asignados a esta clienta. Click
        en uno para ver su histórico completo.
      </p>

      {lista.length === 0 ? (
        <EmptyState
          icono="🏋️"
          titulo="Sin ejercicios programados"
          descripcion="Esta clienta no tiene programas asignados todavía, o sus programas no contienen ejercicios estructurados."
        />
      ) : (
        <div className="border border-neutral-800 rounded-2xl overflow-hidden">
          {lista.map((ej, i) => {
            const imgUrl = ej.imagenPath ? imagenes.get(ej.imagenPath) : null;
            return (
              <Link
                key={ej.ejercicio_id}
                href={`/clientas/${clientaId}/ejercicios/${ej.ejercicio_id}`}
                className={
                  "flex items-center gap-4 px-4 py-3 hover:bg-neutral-900/50 transition " +
                  (i > 0 ? "border-t border-neutral-900" : "")
                }
              >
                <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden flex-shrink-0">
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-700">
                      🏋️
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {ej.nombre}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {ej.apariciones}{" "}
                    {ej.apariciones === 1 ? "aparición" : "apariciones"}
                    {ej.ultimaFecha && (
                      <>
                        {" "}
                        · último:{" "}
                        {new Date(ej.ultimaFecha).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </>
                    )}
                  </div>
                </div>
                <div className="text-neutral-600">→</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
