import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATEGORIAS, type CategoriaRacion } from "@/lib/nutricion";
import { BotonCargarTabla } from "./boton-cargar";

type Alimento = {
  id: string;
  categoria: CategoriaRacion;
  subgrupo: string | null;
  alimento: string;
  cantidad: string;
  notas: string | null;
};

export default async function AlimentosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: alimentos } = await supabase
    .from("alimentos_equivalencias")
    .select("id, categoria, subgrupo, alimento, cantidad, notas")
    .order("categoria", { ascending: true })
    .order("orden", { ascending: true })
    .returns<Alimento[]>();

  const lista = alimentos ?? [];

  return (
    <div className="max-w-3xl">
      <Link
        href="/nutricion"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> Nutrición
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Tabla de alimentos por ración</h1>
      <p className="text-sm text-neutral-400 mb-6">
        1 ración = 10 g del macro principal. Esta tabla es la que ven tus clientas para
        intercambiar alimentos dentro de cada grupo.
      </p>

      {lista.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-10 text-center">
          <p className="text-sm text-neutral-400 mb-4">
            Aún no tienes tabla de alimentos. Carga la tabla del método (≈100 alimentos) y
            edítala a tu gusto.
          </p>
          <BotonCargarTabla />
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORIAS.map((c) => {
            const delCat = lista.filter((a) => a.categoria === c.cat);
            if (delCat.length === 0) return null;
            // Agrupar por subgrupo
            const porSubgrupo = new Map<string, Alimento[]>();
            for (const a of delCat) {
              const k = a.subgrupo ?? "Otros";
              porSubgrupo.set(k, [...(porSubgrupo.get(k) ?? []), a]);
            }
            return (
              <section key={c.cat}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label}
                </h2>
                <div className="space-y-4">
                  {[...porSubgrupo.entries()].map(([sub, items]) => (
                    <div key={sub}>
                      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1.5">{sub}</div>
                      <div className="rounded-xl border border-neutral-800 divide-y divide-neutral-800/70">
                        {items.map((a) => (
                          <div key={a.id} className="flex items-baseline gap-3 px-3 py-2 text-sm">
                            <span className="flex-1">{a.alimento}</span>
                            <span className="text-neutral-300 shrink-0">{a.cantidad}</span>
                            {a.notas && (
                              <span className="text-xs text-neutral-500 shrink-0 hidden sm:inline">{a.notas}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
