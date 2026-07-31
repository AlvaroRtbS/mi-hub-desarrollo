import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BotonPublicada } from "./boton-publicada";

type Receta = {
  id: string;
  nombre: string;
  categoria: string | null;
  icono: string | null;
  por_racion: { kcal?: number; hc?: number; prot?: number; gra?: number };
  alergenos: string[];
  publicada: boolean;
  actualizado_en: string;
};

export default async function RecetasCoachPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("recetas")
    .select("id, nombre, categoria, icono, por_racion, alergenos, publicada, actualizado_en")
    .order("nombre", { ascending: true })
    .returns<Receta[]>();
  const recetas = data ?? [];

  return (
    <div className="p-8 mx-auto max-w-4xl">
      <Link
        href="/nutricion"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> Nutrición
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Recetario</h1>
      <p className="text-sm text-neutral-400 mb-6">
        Las recetas se gestionan en el Recetario local (con su bandeja de
        validación) y se sincronizan desde el{" "}
        <Link href="/cockpit" className="underline underline-offset-2">
          Cockpit
        </Link>{" "}
        con el job «Sincronizar recetario». Aquí decides cuáles ven tus clientas.
      </p>

      {recetas.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-10 text-center text-sm text-neutral-500">
          Sin recetas sincronizadas todavía. Lanza «Sincronizar recetario» desde el
          Cockpit.
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800 divide-y divide-neutral-800/70">
          {recetas.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {r.icono ? `${r.icono} ` : ""}
                  {r.nombre}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {r.categoria ?? "Sin categoría"}
                  {r.por_racion?.kcal != null && ` · ${r.por_racion.kcal} kcal/ración`}
                  {r.alergenos.length > 0 && ` · ${r.alergenos.join(", ")}`}
                </div>
              </div>
              <BotonPublicada id={r.id} publicada={r.publicada} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
