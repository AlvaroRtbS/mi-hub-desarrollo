import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Toma } from "@/lib/nutricion";
import { ConstructorPlan } from "../constructor-plan";

export default async function EditarPlanEquivalenciasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: plan } = await supabase
    .from("nutricion_planes_estructurados")
    .select("*")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      nombre: string;
      clienta_id: string | null;
      calorias: number | null;
      proteina_g: number | null;
      grasa_g: number | null;
      hc_g: number | null;
      raciones_hc: number | null;
      raciones_p: number | null;
      raciones_g: number | null;
      tomas: Toma[];
      notas: string | null;
    }>();

  if (!plan) notFound();

  const { data: clientas } = await supabase
    .from("clientas")
    .select("id, nombre, apellidos")
    .order("nombre", { ascending: true })
    .returns<{ id: string; nombre: string; apellidos: string | null }[]>();

  return (
    <div className="p-8 mx-auto max-w-5xl">
      <Link
        href="/nutricion"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 mb-3"
      >
        <ChevronLeft className="size-4" /> Nutrición
      </Link>
      <h1 className="text-2xl font-semibold mb-6">{plan.nombre}</h1>

      <ConstructorPlan
        clientas={clientas ?? []}
        inicial={{
          id: plan.id,
          nombre: plan.nombre,
          clientaId: plan.clienta_id,
          calorias: plan.calorias,
          proteina_g: plan.proteina_g,
          grasa_g: plan.grasa_g,
          hc_g: plan.hc_g,
          raciones_hc: plan.raciones_hc,
          raciones_p: plan.raciones_p,
          raciones_g: plan.raciones_g,
          tomas: plan.tomas ?? [],
          notas: plan.notas,
        }}
      />
    </div>
  );
}
