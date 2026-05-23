import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlsFirmadas } from "@/lib/supabase/archivos";
import { Boton } from "@/components/ui/boton";
import { BuscadorDebounced } from "@/components/ui/buscador-debounced";
import { EmptyState } from "@/components/ui/empty-state";
import { TarjetaEjercicio } from "./tarjeta-ejercicio";

export default async function EjerciciosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grupo?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const grupo = (params.grupo ?? "").trim();

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("ejercicios")
    .select("id, nombre, descripcion, imagen_url, video_url, grupos_musculares")
    .order("nombre");

  if (q) query = query.ilike("nombre", `%${q}%`);
  if (grupo) query = query.contains("grupos_musculares", [grupo]);

  const { data: ejercicios, error } = await query;

  const { data: todosParaGrupos } = await supabase
    .from("ejercicios")
    .select("grupos_musculares");
  const gruposDisponibles = Array.from(
    new Set(
      (todosParaGrupos ?? [])
        .flatMap((r) => (r.grupos_musculares as string[] | null) ?? [])
        .filter(Boolean)
    )
  ).sort();

  const [imagenes, videos] = await Promise.all([
    obtenerUrlsFirmadas(
      "ejercicios-imagenes",
      (ejercicios ?? []).map((e) => e.imagen_url),
      3600
    ),
    obtenerUrlsFirmadas(
      "ejercicios-videos",
      (ejercicios ?? []).map((e) => e.video_url),
      3600
    ),
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Ejercicios</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {ejercicios?.length ?? 0} ejercicio{(ejercicios?.length ?? 0) === 1 ? "" : "s"} en tu biblioteca.
          </p>
        </div>
        <Boton href="/ejercicios/nuevo">+ Crear</Boton>
      </div>

      <div className="mb-3 max-w-sm">
        <BuscadorDebounced placeholder="Buscar ejercicio..." />
      </div>

      {gruposDisponibles.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-5">
          <Link
            href={"/ejercicios" + (q ? `?q=${encodeURIComponent(q)}` : "")}
            className={
              "text-xs px-2.5 py-1 rounded-full border " +
              (!grupo
                ? "bg-brand-600 border-brand-600 text-white"
                : "border-neutral-800 text-neutral-400 hover:text-white")
            }
          >
            Todos
          </Link>
          {gruposDisponibles.map((g) => {
            const sp = new URLSearchParams();
            if (q) sp.set("q", q);
            sp.set("grupo", g);
            return (
              <Link
                key={g}
                href={`/ejercicios?${sp.toString()}`}
                className={
                  "text-xs px-2.5 py-1 rounded-full border " +
                  (grupo === g
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-neutral-800 text-neutral-400 hover:text-white")
                }
              >
                {g}
              </Link>
            );
          })}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-3 mb-4">
          {error.message}
        </div>
      )}

      {!ejercicios || ejercicios.length === 0 ? (
        <EmptyState
          icono="🏋️"
          titulo={
            q || grupo
              ? "Ningún ejercicio coincide"
              : "Aún no tienes ejercicios"
          }
          descripcion={
            !q && !grupo
              ? "Añade tu primer ejercicio con vídeo demostrativo o impórtalo desde TrainerStudio."
              : "Prueba con otra búsqueda o quita los filtros."
          }
          accion={!q && !grupo ? <Boton href="/ejercicios/nuevo">+ Crear ejercicio</Boton> : null}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {ejercicios.map((e) => {
            const imagenUrl = e.imagen_url ? imagenes.get(e.imagen_url) ?? null : null;
            const videoUrl = e.video_url ? videos.get(e.video_url) ?? null : null;
            return (
              <TarjetaEjercicio
                key={e.id}
                href={`/ejercicios/${e.id}/editar`}
                nombre={e.nombre}
                imagenUrl={imagenUrl}
                videoUrl={videoUrl}
                grupos={(e.grupos_musculares as string[] | null) ?? []}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
