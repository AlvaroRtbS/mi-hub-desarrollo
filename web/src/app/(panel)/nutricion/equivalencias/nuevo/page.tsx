import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConstructorPlan } from "../constructor-plan";

export default async function NuevoPlanEquivalenciasPage() {
  const supabase = await createSupabaseServerClient();
  const { data: clientas } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .order("nombre", { ascending: true })
    .returns<{ id: string; nombre: string; apellidos: string | null }[]>();

  return (
    <div className="p-4 pt-16 md:p-8 mx-auto max-w-5xl">
      <Link
        href="/nutricion"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> Nutrición
      </Link>
      <h1 className="text-2xl font-semibold mb-6">Nuevo plan por equivalencias</h1>

      <ConstructorPlan
        clientas={clientas ?? []}
        inicial={{
          nombre: "",
          clientaId: null,
          calorias: null,
          proteina_g: null,
          grasa_g: null,
          hc_g: null,
          raciones_hc: null,
          raciones_p: null,
          raciones_g: null,
          tomas: [],
          notas: null,
        }}
      />
    </div>
  );
}
