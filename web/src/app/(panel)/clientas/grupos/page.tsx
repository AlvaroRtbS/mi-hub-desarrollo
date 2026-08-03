import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Boton } from "@/components/ui/boton";
import { FormularioGrupo } from "./formulario-grupo";

type Grupo = {
  id: string;
  nombre: string;
  color: string | null;
  clienta_grupos: { count: number }[];
};

export default async function GruposPage() {
  const supabase = await createSupabaseServerClient();

  const { data: gruposData } = await supabase
    .from("grupos")
    .select("id, nombre, color, clienta_grupos(count)")
    .order("nombre");

  const grupos = (gruposData ?? []) as unknown as Grupo[];

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-3xl">
      <Link
        href="/clientas"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver a clientas
      </Link>

      <div className="mt-4 flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Grupos de clientas</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Etiquetas para organizar tus clientas (Online, Presencial, Grupo
            lunes/miércoles, etc).
          </p>
        </div>
      </div>

      <div className="mb-6">
        <FormularioGrupo />
      </div>

      {grupos.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          Aún no tienes grupos. Crea uno arriba.
        </div>
      ) : (
        <div className="space-y-2">
          {grupos.map((g) => (
            <div
              key={g.id}
              className="border border-neutral-800 rounded-xl px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: g.color ?? "#737373" }}
                />
                <Link
                  href={`/clientas?grupo=${g.id}`}
                  className="text-sm font-medium hover:text-brand-500"
                >
                  {g.nombre}
                </Link>
                <span className="text-xs text-neutral-500">
                  {g.clienta_grupos?.[0]?.count ?? 0} clientas
                </span>
              </div>
              <form action={async () => {
                "use server";
                const { eliminarGrupo } = await import("./acciones");
                await eliminarGrupo(g.id);
              }}>
                <button
                  type="submit"
                  className="text-xs text-neutral-500 hover:text-red-400"
                >
                  Eliminar
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
