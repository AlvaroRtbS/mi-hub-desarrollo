import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { obtenerUrlFirmada } from "@/lib/supabase/archivos";
import { formatearFecha } from "@/lib/utilidades";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckListaCliente } from "./check-lista";
import { PlanEquivalencias } from "./plan-equivalencias";
import type {
  AlimentoEquivalencia,
  PlanEstructurado,
} from "@/lib/nutricion";

type Plan = {
  id: string;
  nombre: string;
  descripcion: string | null;
  pdf_url: string | null;
  contenido_markdown: string | null;
  creado_en: string;
};

type ItemLista = {
  id: string;
  nombre: string;
  cantidad?: string | null;
  categoria?: string | null;
  comprado: boolean;
};

type Lista = {
  id: string;
  nombre: string;
  items: ItemLista[];
  actualizada_en: string;
};

export default async function NutricionClientaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: clienta } = await supabase
    .from("clientas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!clienta) return null;

  // Plan estructurado por equivalencias (el más reciente activo)
  const { data: planEstruct } = await supabase
    .from("nutricion_planes_estructurados")
    .select(
      "id, nombre, calorias, proteina_g, grasa_g, hc_g, raciones_hc, raciones_p, raciones_g, tomas, notas"
    )
    .eq("clienta_id", clienta.id)
    .eq("activo", true)
    .order("actualizado_en", { ascending: false })
    .limit(1)
    .maybeSingle<PlanEstructurado>();

  // Tabla de alimentos del coach (para los intercambios del plan)
  const alimentos: AlimentoEquivalencia[] = planEstruct
    ? ((
        await supabase
          .from("alimentos_equivalencias")
          .select("id, categoria, subgrupo, alimento, cantidad, notas")
          .order("categoria", { ascending: true })
          .order("orden", { ascending: true })
      ).data ?? [])
    : [];

  // Planes de nutrición asignados a esta clienta
  const { data: planesData } = await supabase
    .from("nutricion_planes")
    .select("id, nombre, descripcion, pdf_url, contenido_markdown, creado_en")
    .eq("clienta_id", clienta.id)
    .order("creado_en", { ascending: false });
  const planes = (planesData ?? []) as Plan[];

  // Firmar las URLs de los PDFs (el bucket es privado)
  const planesConUrl = await Promise.all(
    planes.map(async (p) => ({
      ...p,
      pdfUrlFirmada: p.pdf_url
        ? await obtenerUrlFirmada("nutricion-pdfs", p.pdf_url, 3600)
        : null,
    }))
  );

  // Listas de la compra de esta clienta
  const { data: listasData } = await supabase
    .from("listas_compra")
    .select("id, nombre, items, actualizada_en")
    .eq("clienta_id", clienta.id)
    .order("actualizada_en", { ascending: false });
  const listas = (listasData ?? []) as Lista[];

  // Recetario publicado del coach (RLS filtra)
  const { count: nRecetas } = await supabase
    .from("recetas")
    .select("id", { count: "exact", head: true });

  const sinNada =
    !planEstruct &&
    planesConUrl.length === 0 &&
    listas.length === 0 &&
    (nRecetas ?? 0) === 0;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Mi nutrición</h1>
      <p className="text-sm text-neutral-400 mb-4">
        Tu plan de alimentación y tu lista de la compra.
      </p>

      {sinNada && (
        <EmptyState
          icono="🥗"
          titulo="Sin plan de nutrición todavía"
          descripcion="Tu entrenador aún no te ha asignado un plan. Cuando lo haga, aparecerá aquí."
        />
      )}

      {/* Recetario del coach */}
      {(nRecetas ?? 0) > 0 && (
        <Link
          href="/c/recetas"
          className="flex items-center justify-between border border-neutral-800 rounded-2xl p-4 bg-neutral-950 hover:border-neutral-700 transition mb-6"
        >
          <div>
            <div className="font-medium">🍳 Recetario</div>
            <div className="text-xs text-neutral-500 mt-0.5">
              {nRecetas} receta{nRecetas === 1 ? "" : "s"} con macros por ración
            </div>
          </div>
          <span className="text-neutral-600">›</span>
        </Link>
      )}

      {/* Plan estructurado por equivalencias */}
      {planEstruct && (
        <div className="mb-6">
          <PlanEquivalencias plan={planEstruct} alimentos={alimentos} />
        </div>
      )}

      {/* Planes de nutrición (documento) */}
      {planesConUrl.length > 0 && (
        <section className="space-y-4">
          {planesConUrl.map((p) => (
            <div
              key={p.id}
              className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-medium">{p.nombre}</h2>
                <span className="text-[10px] text-neutral-600 shrink-0">
                  {formatearFecha(p.creado_en)}
                </span>
              </div>
              {p.descripcion && (
                <p className="text-sm text-neutral-400 mt-1">{p.descripcion}</p>
              )}

              {p.pdfUrlFirmada && (
                <a
                  href={p.pdfUrlFirmada}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-sm font-medium px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "var(--brand)", color: "#fff" }}
                >
                  📄 Abrir PDF del plan
                </a>
              )}

              {p.contenido_markdown && (
                <div className="text-sm whitespace-pre-wrap text-neutral-200 mt-3 leading-relaxed">
                  {p.contenido_markdown}
                </div>
              )}

              {!p.pdfUrlFirmada && !p.contenido_markdown && (
                <p className="text-xs text-neutral-600 mt-2">
                  Este plan aún no tiene contenido.
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Listas de la compra */}
      {listas.length > 0 && (
        <section className="mt-6 space-y-4">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500">
            Lista de la compra
          </h2>
          {listas.map((l) => (
            <div
              key={l.id}
              className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950"
            >
              <div className="text-base font-medium mb-3">{l.nombre}</div>
              {Array.isArray(l.items) && l.items.length > 0 ? (
                <CheckListaCliente listaId={l.id} items={l.items} />
              ) : (
                <p className="text-xs text-neutral-600">Lista vacía.</p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
