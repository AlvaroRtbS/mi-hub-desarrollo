"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Glosario } from "@/components/ui/glosario";
import {
  type AlimentoEquivalencia,
  type CategoriaRacion,
  type PlanEstructurado,
  CATEGORIAS,
  etiquetaCategoria,
} from "@/lib/nutricion";

const ORDEN_CHIPS: { campo: "hc" | "p" | "g" | "v"; cat: CategoriaRacion }[] = [
  { campo: "hc", cat: "HC" },
  { campo: "p", cat: "P" },
  { campo: "g", cat: "G" },
  { campo: "v", cat: "V" },
];

function color(cat: CategoriaRacion) {
  return CATEGORIAS.find((c) => c.cat === cat)?.color ?? "#737373";
}

export function PlanEquivalencias({
  plan,
  alimentos,
}: {
  plan: PlanEstructurado;
  alimentos: AlimentoEquivalencia[];
}) {
  // Categoría abierta en el modal de intercambios + raciones que necesita.
  const [abierto, setAbierto] = useState<{ cat: CategoriaRacion; raciones: number } | null>(null);

  const alimentosCat = abierto
    ? alimentos.filter((a) => a.categoria === abierto.cat)
    : [];

  // Agrupar por subgrupo para el modal
  const porSubgrupo = new Map<string, AlimentoEquivalencia[]>();
  for (const a of alimentosCat) {
    const k = a.subgrupo ?? "Otros";
    porSubgrupo.set(k, [...(porSubgrupo.get(k) ?? []), a]);
  }

  return (
    <section className="space-y-4">
      <div className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-medium">{plan.nombre}</h2>
          {plan.calorias && (
            <span className="text-xs text-neutral-400 shrink-0">{plan.calorias} kcal</span>
          )}
        </div>
        {(plan.raciones_hc != null || plan.raciones_p != null) && (
          <p className="text-xs text-neutral-500 mt-1">
            Al día: {plan.raciones_hc ?? 0} HC · {plan.raciones_p ?? 0} P · {plan.raciones_g ?? 0} G
          </p>
        )}
        <div className="mt-3 rounded-xl bg-neutral-900/60 border border-neutral-800 p-3 text-xs text-neutral-300 leading-relaxed">
          <div className="font-medium text-neutral-200 mb-1">¿Cómo funciona tu dieta? 🍽️</div>
          Cada toma te dice cuántas <strong>raciones</strong>{" "}
          <Glosario termino="racion" /> comer de cada grupo
          (hidratos, proteína, grasa y verdura). Una ración es una porción —{" "}
          <strong>toca cualquier grupo</strong> y verás con qué alimentos cumplirla y
          en qué cantidad. ¿No te gusta algo? Cámbialo por otro del mismo grupo: comes
          lo que te apetece sin salirte del plan.
        </div>
      </div>

      {/* Tomas */}
      <div className="space-y-3">
        {plan.tomas.map((t) => (
          <div key={t.id} className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950">
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <h3 className="font-medium">{t.nombre}</h3>
              {t.hora && <span className="text-xs text-neutral-500">{t.hora}</span>}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ORDEN_CHIPS.map(({ campo, cat }) => {
                const n = t[campo] || 0;
                const deshab = n === 0;
                return (
                  <button
                    key={campo}
                    disabled={deshab}
                    onClick={() => setAbierto({ cat, raciones: n })}
                    className={`rounded-xl border px-2 py-2 text-center transition ${
                      deshab
                        ? "border-neutral-800/50 opacity-40"
                        : "border-neutral-700 hover:bg-neutral-900 active:scale-95"
                    }`}
                  >
                    <div className="text-lg font-semibold tabular-nums" style={{ color: color(cat) }}>
                      {n}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">
                      {cat === "V" ? "Verd." : cat}
                    </div>
                  </button>
                );
              })}
            </div>

            {t.menu && t.menu.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-neutral-800 pt-3">
                {t.menu.map((linea, i) => (
                  <li key={i} className="flex gap-2 text-sm text-neutral-200">
                    <span className="text-neutral-600">·</span>
                    <span>{linea}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {plan.notas && (
        <div className="border border-neutral-800 rounded-2xl p-4 bg-neutral-950">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Notas</div>
          <p className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed">{plan.notas}</p>
        </div>
      )}

      {/* Modal de intercambios */}
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={() => setAbierto(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 w-full sm:max-w-md max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-neutral-800 shrink-0">
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: color(abierto.cat) }} />
                  {etiquetaCategoria(abierto.cat)}
                </div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Necesitas <strong className="text-neutral-100">{abierto.raciones}</strong> {abierto.raciones === 1 ? "ración" : "raciones"} — elige los alimentos que sumen esa cantidad.
                </div>
              </div>
              <button onClick={() => setAbierto(null)} className="p-1.5 text-neutral-400 hover:text-neutral-100" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-3 space-y-4">
              {alimentosCat.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Tu entrenador aún no ha cargado la tabla de alimentos.
                </p>
              ) : (
                [...porSubgrupo.entries()].map(([sub, items]) => (
                  <div key={sub}>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1.5">{sub}</div>
                    <div className="space-y-1.5">
                      {items.map((a) => (
                        <div key={a.id} className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="flex-1">{a.alimento}</span>
                          <span className="text-neutral-300 shrink-0">
                            {abierto.raciones > 1 && (
                              <span className="text-neutral-500 mr-1">{abierto.raciones}×</span>
                            )}
                            {a.cantidad}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
