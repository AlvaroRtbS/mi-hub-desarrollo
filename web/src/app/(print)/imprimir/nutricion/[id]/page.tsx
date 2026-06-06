import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Toma } from "@/lib/nutricion";
import { BotonImprimirCabecera as BotonImprimir } from "../../../boton-imprimir-cabecera";

export const metadata = { title: "Imprimir plan de nutrición" };

export default async function ImprimirNutricionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: plan } = await supabase
    .from("nutricion_planes_estructurados")
    .select(
      "id, nombre, calorias, proteina_g, grasa_g, hc_g, raciones_hc, raciones_p, raciones_g, tomas, notas, clienta_id, coach_id, clientas(nombre, apellidos)"
    )
    .eq("id", id)
    .maybeSingle<{
      id: string;
      nombre: string;
      calorias: number | null;
      proteina_g: number | null;
      grasa_g: number | null;
      hc_g: number | null;
      raciones_hc: number | null;
      raciones_p: number | null;
      raciones_g: number | null;
      tomas: Toma[];
      notas: string | null;
      coach_id: string;
      clientas: { nombre: string; apellidos: string | null } | null;
    }>();

  if (!plan) notFound();

  const { data: coach } = await supabase
    .from("coaches")
    .select("nombre, marca_nombre, marca_color_primario")
    .eq("id", plan.coach_id)
    .maybeSingle<{ nombre: string; marca_nombre: string | null; marca_color_primario: string | null }>();

  const color = coach?.marca_color_primario ?? "#16a34a";
  const marca = coach?.marca_nombre ?? coach?.nombre ?? "";
  const clienta = plan.clientas
    ? `${plan.clientas.nombre} ${plan.clientas.apellidos ?? ""}`.trim()
    : null;
  const tomas = plan.tomas ?? [];

  return (
    <div>
      <BotonImprimir />
      <div className="max-w-3xl mx-auto p-8 print:p-0">
        {/* Cabecera */}
        <div className="border-b-2 pb-4 mb-6" style={{ borderColor: color }}>
          {marca && (
            <div className="text-xs uppercase tracking-wide font-semibold" style={{ color }}>
              {marca}
            </div>
          )}
          <h1 className="text-2xl font-bold mt-1">{plan.nombre}</h1>
          <div className="text-sm text-neutral-600 mt-1">
            {clienta ? `Para ${clienta}` : "Plantilla"}
            {plan.calorias ? ` · ${plan.calorias} kcal` : ""}
          </div>
          {(plan.proteina_g || plan.hc_g || plan.grasa_g) && (
            <div className="text-sm text-neutral-600 mt-0.5">
              {plan.proteina_g ?? 0} g proteína · {plan.grasa_g ?? 0} g grasa ·{" "}
              {plan.hc_g ?? 0} g hidratos
            </div>
          )}
          {(plan.raciones_hc != null) && (
            <div className="text-sm text-neutral-600 mt-0.5">
              Raciones/día: {plan.raciones_hc ?? 0} HC · {plan.raciones_p ?? 0} P ·{" "}
              {plan.raciones_g ?? 0} G
            </div>
          )}
        </div>

        {/* Tomas */}
        <div className="space-y-5">
          {tomas.map((t) => (
            <div key={t.id} className="break-inside-avoid">
              <div className="flex items-baseline justify-between border-b border-neutral-200 pb-1 mb-2">
                <h2 className="text-lg font-semibold">{t.nombre}</h2>
                <span className="text-sm text-neutral-500">{t.hora}</span>
              </div>
              <div className="text-xs text-neutral-500 mb-2">
                {t.hc} HC · {t.p} P · {t.g} G{t.v ? ` · ${t.v} verdura` : ""}
              </div>
              {t.menu && t.menu.length > 0 ? (
                <ul className="list-disc pl-5 text-sm space-y-0.5">
                  {t.menu.map((linea, i) => (
                    <li key={i}>{linea}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-400 italic">
                  Elige alimentos según las raciones indicadas.
                </p>
              )}
            </div>
          ))}
        </div>

        {plan.notas && (
          <div className="mt-6 border-t border-neutral-200 pt-4">
            <div className="text-sm font-semibold mb-1">Notas</div>
            <p className="text-sm whitespace-pre-wrap text-neutral-700">{plan.notas}</p>
          </div>
        )}

        <div className="mt-8 text-xs text-neutral-400">
          1 ración = 10 g del macronutriente. Puedes intercambiar alimentos dentro de cada
          grupo según tu tabla de equivalencias.
        </div>
      </div>
    </div>
  );
}
