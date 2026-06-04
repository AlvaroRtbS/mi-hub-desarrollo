import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Boton } from "@/components/ui/boton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatearFecha } from "@/lib/utilidades";

type ProgramaResumen = {
  id: string;
  nombre: string;
  descripcion: string | null;
  num_semanas: number;
  actualizado_en: string;
  asignaciones: { count: number }[];
};

export default async function ProgramasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("programas")
    .select(
      "id, nombre, descripcion, num_semanas, actualizado_en, asignaciones(count)"
    )
    .order("actualizado_en", { ascending: false });

  if (q) query = query.ilike("nombre", `%${q}%`);

  const { data: programas, error } = await query;
  const filas = (programas ?? []) as unknown as ProgramaResumen[];

  return (
    <div className="p-8 mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Programas</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Plantillas de entrenamiento reutilizables. Asígnalas a tus clientas.
          </p>
        </div>
        <Boton href="/programas/nuevo">+ Crear programa</Boton>
      </div>

      <form className="mb-4 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar programa..."
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </form>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 mb-4">
          {error.message}
        </div>
      )}

      {filas.length === 0 ? (
        <EmptyState
          icono="📋"
          titulo={
            q
              ? "Ningún programa coincide con la búsqueda"
              : "Aún no tienes ningún programa"
          }
          descripcion={
            q
              ? "Prueba con otras palabras o crea uno nuevo."
              : "Los programas son plantillas reutilizables (ej. \"Pérdida de peso 12 semanas\"). Construyes la estructura semana→día→bloque→ejercicio una vez y la asignas a tantas clientas como quieras, ajustando por persona."
          }
          accion={<Boton href="/programas/nuevo">+ Crear mi primer programa</Boton>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filas.map((p) => {
            const asignaciones = p.asignaciones?.[0]?.count ?? 0;
            return (
              <Link
                key={p.id}
                href={`/programas/${p.id}`}
                className="block border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 hover:bg-neutral-900/50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.nombre}</div>
                    {p.descripcion && (
                      <div className="text-sm text-neutral-500 mt-0.5 line-clamp-2">
                        {p.descripcion}
                      </div>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 whitespace-nowrap">
                    {p.num_semanas} sem
                  </span>
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-neutral-500">
                  <span>
                    {asignaciones === 0
                      ? "Sin asignar"
                      : asignaciones === 1
                      ? "1 clienta"
                      : `${asignaciones} clientas`}
                  </span>
                  <span>Editado {formatearFecha(p.actualizado_en)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
