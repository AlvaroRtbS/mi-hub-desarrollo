import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type CategoriaRacion } from "@/lib/nutricion";
import { BotonCargarTabla } from "./boton-cargar";
import { EditorAlimentos } from "./editor-alimentos";

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
    <div className="p-8 mx-auto max-w-5xl">
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
        <EditorAlimentos alimentos={lista} />
      )}
    </div>
  );
}
