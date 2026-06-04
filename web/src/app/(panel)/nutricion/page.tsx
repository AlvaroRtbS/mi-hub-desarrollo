import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Boton } from "@/components/ui/boton";
import { formatearFecha } from "@/lib/utilidades";

type Plan = {
  id: string;
  nombre: string;
  descripcion: string | null;
  pdf_url: string | null;
  contenido_markdown: string | null;
  clienta_id: string | null;
  creado_en: string;
  clientas: { nombre: string; apellidos: string | null } | null;
};

type Lista = {
  id: string;
  nombre: string;
  items: Array<{ id: string; nombre: string; comprado: boolean }>;
  creada_en: string;
  clientas: { id: string; nombre: string; apellidos: string | null } | null;
};

type PlanEstruct = {
  id: string;
  nombre: string;
  calorias: number | null;
  clienta_id: string | null;
  clientas: { nombre: string; apellidos: string | null } | null;
};

export default async function NutricionPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: planesData }, { data: listasData }, { data: estructData }] =
    await Promise.all([
      supabase
        .from("nutricion_planes")
        .select(
          "id, nombre, descripcion, pdf_url, contenido_markdown, clienta_id, creado_en, clientas(nombre, apellidos)"
        )
        .order("creado_en", { ascending: false }),
      supabase
        .from("listas_compra")
        .select("id, nombre, items, creada_en, clientas(id, nombre, apellidos)")
        .order("creada_en", { ascending: false }),
      supabase
        .from("nutricion_planes_estructurados")
        .select("id, nombre, calorias, clienta_id, clientas(nombre, apellidos)")
        .order("actualizado_en", { ascending: false }),
    ]);

  const planes = (planesData ?? []) as unknown as Plan[];
  const listas = (listasData ?? []) as unknown as Lista[];
  const estructurados = (estructData ?? []) as unknown as PlanEstruct[];

  return (
    <div className="p-8 mx-auto max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Nutrición</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Planes de alimentación (plantillas o asignadas a clienta) y listas de la
            compra.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Boton variante="secundario" href="/nutricion/alimentos">
            Tabla de alimentos
          </Boton>
          <Boton variante="secundario" href="/nutricion/lista/nueva">
            + Lista de compra
          </Boton>
          <Boton variante="secundario" href="/nutricion/plan/nuevo">
            + Plan (documento)
          </Boton>
          <Boton href="/nutricion/equivalencias/nuevo">+ Plan por equivalencias</Boton>
        </div>
      </div>

      <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-3">
        Planes por equivalencias ({estructurados.length})
      </h2>
      {estructurados.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center mb-8">
          <div className="text-sm text-neutral-500">
            Crea un plan estructurado por raciones. La clienta verá su reparto por tomas y
            podrá intercambiar alimentos.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {estructurados.map((p) => (
            <Link
              key={p.id}
              href={`/nutricion/equivalencias/${p.id}`}
              className="block border border-neutral-800 rounded-2xl p-4 hover:border-neutral-700 hover:bg-neutral-900/50"
            >
              <div className="font-medium truncate">{p.nombre}</div>
              <div className="text-xs text-neutral-500 mt-1">
                {p.clientas
                  ? `${p.clientas.nombre} ${p.clientas.apellidos ?? ""}`
                  : "Plantilla (sin asignar)"}
                {p.calorias ? ` · ${p.calorias} kcal` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-3">
        Planes documento ({planes.length})
      </h2>
      {planes.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center mb-8">
          <div className="text-sm text-neutral-500">
            Aún no has subido ningún plan de nutrición.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {planes.map((p) => (
            <Link
              key={p.id}
              href={`/nutricion/plan/${p.id}`}
              className="block border border-neutral-800 rounded-2xl p-4 hover:border-neutral-700 hover:bg-neutral-900/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.nombre}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {p.clientas
                      ? `${p.clientas.nombre} ${p.clientas.apellidos ?? ""}`
                      : "Plantilla (sin asignar)"}
                  </div>
                  {p.descripcion && (
                    <div className="text-sm text-neutral-400 mt-2 line-clamp-2">
                      {p.descripcion}
                    </div>
                  )}
                </div>
                {p.pdf_url && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/40 border border-red-900/50 text-red-300 whitespace-nowrap">
                    PDF
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-600 mt-2">
                Creado {formatearFecha(p.creado_en)}
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-3 mt-6">
        Listas de la compra ({listas.length})
      </h2>
      {listas.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded-2xl p-8 text-center">
          <div className="text-sm text-neutral-500">
            Sin listas. Crea una para una clienta con los productos que necesita.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {listas.map((l) => {
            const total = l.items.length;
            const comprados = l.items.filter((i) => i.comprado).length;
            return (
              <Link
                key={l.id}
                href={`/nutricion/lista/${l.id}`}
                className="flex items-center justify-between border border-neutral-800 rounded-xl px-4 py-3 hover:border-neutral-700 hover:bg-neutral-900/50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.nombre}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {l.clientas
                      ? `${l.clientas.nombre} ${l.clientas.apellidos ?? ""}`
                      : "—"}{" "}
                    · {formatearFecha(l.creada_en)}
                  </div>
                </div>
                <div className="text-xs text-neutral-400 flex-shrink-0">
                  {comprados} / {total}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
