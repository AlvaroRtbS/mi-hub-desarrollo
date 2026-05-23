import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlFirmada } from "@/lib/supabase/archivos";
import { formatearFecha } from "@/lib/utilidades";
import { Boton } from "@/components/ui/boton";
import { BotonEliminarPlan } from "./boton-eliminar";

export default async function PlanDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: plan } = await supabase
    .from("nutricion_planes")
    .select(
      "id, nombre, descripcion, pdf_url, contenido_markdown, clienta_id, creado_en, clientas(id, nombre, apellidos)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!plan) notFound();

  const pdfUrl = await obtenerUrlFirmada("nutricion-pdfs", plan.pdf_url, 3600);
  const clientaObj = plan.clientas as unknown as
    | { id: string; nombre: string; apellidos: string | null }
    | null;

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href="/nutricion"
        className="text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Volver
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{plan.nombre}</h1>
          {plan.descripcion && (
            <p className="text-sm text-neutral-400 mt-1">{plan.descripcion}</p>
          )}
          <div className="text-xs text-neutral-500 mt-2">
            {clientaObj ? (
              <Link
                href={`/clientas/${clientaObj.id}`}
                className="hover:text-brand-500"
              >
                {clientaObj.nombre} {clientaObj.apellidos ?? ""}
              </Link>
            ) : (
              <span>Plantilla (sin asignar)</span>
            )}
            <span> · Creado {formatearFecha(plan.creado_en)}</span>
          </div>
        </div>
        <BotonEliminarPlan id={plan.id} />
      </div>

      {pdfUrl && (
        <div className="mt-6">
          <Boton variante="secundario" href={pdfUrl}>
            Abrir PDF
          </Boton>
        </div>
      )}

      {plan.contenido_markdown && (
        <div className="mt-6 border border-neutral-800 rounded-2xl p-5">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
            Contenido
          </div>
          <pre className="text-sm whitespace-pre-wrap font-sans text-neutral-200">
            {plan.contenido_markdown}
          </pre>
        </div>
      )}

      {!pdfUrl && !plan.contenido_markdown && (
        <div className="mt-6 border border-dashed border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          Este plan no tiene PDF ni contenido en texto.
        </div>
      )}
    </div>
  );
}
