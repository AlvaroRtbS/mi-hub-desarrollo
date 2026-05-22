import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
import { Boton } from "@/components/ui/boton";
import type { Ejercicio } from "@/lib/supabase/tipos";

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("ejercicios")
    .select("id, nombre, descripcion, imagen_url, video_url, grupos_musculares")
    .order("nombre");

  if (q) query = query.ilike("nombre", `%${q}%`);

  const { data: ejercicios, error } = await query;

  const imagenes = await obtenerUrlsFirmadas(
    "ejercicios-imagenes",
    (ejercicios ?? []).map((e) => e.imagen_url),
    3600
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Ejercicios</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Crea y organiza tu biblioteca de ejercicios con vídeos e instrucciones.
          </p>
        </div>
        <Boton href="/ejercicios/nuevo">+ Crear</Boton>
      </div>

      <form className="mb-4 max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar ejercicio..."
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </form>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 mb-4">
          {error.message}
        </div>
      )}

      {!ejercicios || ejercicios.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
          <div className="text-neutral-400">
            {q ? "Ningún ejercicio coincide." : "Aún no tienes ejercicios en tu biblioteca."}
          </div>
          {!q && (
            <div className="text-sm text-neutral-500 mt-2">
              Pulsa "Crear" para añadir tu primer ejercicio con vídeo.
            </div>
          )}
        </div>
      ) : (
        <div className="border border-neutral-800 rounded-2xl overflow-hidden">
          {ejercicios.map((e, idx) => {
            const url = e.imagen_url ? imagenes.get(e.imagen_url) ?? null : null;
            return (
              <Link
                key={e.id}
                href={`/ejercicios/${e.id}/editar`}
                className={
                  "flex items-center gap-4 px-4 py-3 hover:bg-neutral-900/50 " +
                  (idx > 0 ? "border-t border-neutral-800" : "")
                }
              >
                <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-800 overflow-hidden flex-shrink-0">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-700 text-xs">
                      {e.video_url ? "▶" : "—"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.nombre}</div>
                  {e.descripcion && (
                    <div className="text-xs text-neutral-500 truncate">{e.descripcion}</div>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {(e.grupos_musculares as string[] | null)?.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="text-xs px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
