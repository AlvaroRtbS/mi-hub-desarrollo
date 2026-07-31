import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { ListaRecetas, type Receta } from "./lista-recetas";

export default async function RecetasClientaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id, dieta_restricciones")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: string;
      dieta_restricciones: { flags?: string[] } | null;
    }>();
  if (!clienta) return null;

  // RLS ya limita a recetas publicadas del coach de esta clienta.
  const { data: recetasData } = await supabase
    .from("recetas")
    .select(
      "id, nombre, categoria, descripcion, icono, sabor, momentos, alergenos, por_racion, racion_g, ingredientes, pasos, consejos, tiempo_min"
    )
    .order("nombre", { ascending: true });
  const recetas = (recetasData ?? []) as Receta[];

  // Los flags de restricciones usan claves "sin_gluten"; los alérgenos de
  // recetas usan "gluten". Traducimos flags → tokens de alérgeno.
  const misAlergenos = (clienta.dieta_restricciones?.flags ?? [])
    .filter((f) => f.startsWith("sin_"))
    .map((f) => f.slice(4));

  return (
    <div>
      <Link
        href="/c/nutricion"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> Mi nutrición
      </Link>
      <h1 className="text-xl font-semibold mb-1">Recetario</h1>
      <p className="text-sm text-neutral-400 mb-4">
        Recetas de tu entrenador con sus macros por ración. Encajan en tu plan
        como cualquier intercambio.
      </p>

      {recetas.length === 0 ? (
        <EmptyState
          icono="🍳"
          titulo="Sin recetas todavía"
          descripcion="Tu entrenador aún no ha publicado recetas. En cuanto lo haga, las verás aquí."
        />
      ) : (
        <ListaRecetas recetas={recetas} misAlergenos={misAlergenos} />
      )}
    </div>
  );
}
