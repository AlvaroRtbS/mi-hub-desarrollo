"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarRegistroSerie } from "./acciones";
import type { ElementoEjercicio } from "@/lib/supabase/tipos";

type SerieRealizada = {
  peso: string;
  reps: string;
  completado: boolean;
};

/**
 * Tarjeta interactiva del ejercicio: la clienta marca cada serie cuando la
 * hace, anota el peso y las reps reales, y todo se guarda en
 * sesiones.registros[elementoId].series_realizadas.
 *
 * Auto-save: el toggle "completado" guarda al instante. Los inputs de
 * peso/reps guardan en onBlur (al perder el foco) para no machacar el server
 * en cada tecla.
 */
export function RegistroEjercicio({
  clientaId,
  fecha,
  semana,
  dia,
  elemento,
  registroExistente,
}: {
  clientaId: string;
  fecha: string;
  semana: number;
  dia: number;
  elemento: ElementoEjercicio;
  registroExistente: SerieRealizada[] | null;
}) {
  const router = useRouter();
  const [enviando, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Estado local con los registros. Arranca con lo registrado (si existe),
  // si no con los valores planificados (peso/reps) pero sin marcar completado.
  const inicial: SerieRealizada[] = (() => {
    if (registroExistente && registroExistente.length > 0) {
      // Padding por si el plan tiene más series de las registradas
      const out = [...registroExistente];
      while (out.length < elemento.series.length) {
        const planificada = elemento.series[out.length]!;
        out.push({
          peso: planificada.peso,
          reps: planificada.reps,
          completado: false,
        });
      }
      return out;
    }
    return elemento.series.map((s) => ({
      peso: s.peso,
      reps: s.reps,
      completado: false,
    }));
  })();

  const [series, setSeries] = useState<SerieRealizada[]>(inicial);

  function guardarParche(serieIdx: number, parche: Partial<SerieRealizada>) {
    setError(null);
    startTransition(async () => {
      const r = await guardarRegistroSerie({
        clientaId,
        fecha,
        semana,
        dia,
        elementoId: elemento.id,
        serieIdx,
        parche,
      });
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function toggleCompleto(idx: number) {
    const nuevo = !series[idx]!.completado;
    setSeries((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, completado: nuevo } : s))
    );
    // Si se marca completado y el peso/reps están vacíos, copiar del plan
    const actual = series[idx]!;
    const peso = actual.peso || elemento.series[idx]?.peso || "";
    const reps = actual.reps || elemento.series[idx]?.reps || "";
    guardarParche(idx, { completado: nuevo, peso, reps });
  }

  function cambiarValor(
    idx: number,
    campo: "peso" | "reps",
    valor: string
  ) {
    setSeries((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [campo]: valor } : s))
    );
  }

  function guardarValorAlSalir(
    idx: number,
    campo: "peso" | "reps"
  ) {
    guardarParche(idx, { [campo]: series[idx]![campo] });
  }

  const total = series.length;
  const completadas = series.filter((s) => s.completado).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-wide text-neutral-500">
          Series
        </div>
        <div className="text-[10px] text-neutral-500">
          {completadas}/{total}
        </div>
      </div>
      <ul className="space-y-1.5">
        {series.map((s, idx) => {
          const planificada = elemento.series[idx];
          return (
            <li
              key={idx}
              className={
                "flex items-center gap-2 rounded-lg px-2 py-1.5 transition " +
                (s.completado
                  ? "bg-green-950/20 border border-green-900/40"
                  : "bg-neutral-900/50 border border-neutral-800")
              }
            >
              <button
                onClick={() => toggleCompleto(idx)}
                disabled={enviando}
                className={
                  "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition " +
                  (s.completado
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-neutral-700 hover:border-brand-500")
                }
                aria-label={
                  s.completado ? "Marcar serie como no hecha" : "Marcar serie como hecha"
                }
              >
                {s.completado && (
                  <span className="text-[10px] leading-none">✓</span>
                )}
              </button>
              <span className="text-[10px] text-neutral-500 w-7 tabular-nums">
                S{idx + 1}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={s.peso}
                onChange={(e) => cambiarValor(idx, "peso", e.target.value)}
                onBlur={() => guardarValorAlSalir(idx, "peso")}
                placeholder={planificada?.peso || "kg"}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm w-16 focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-neutral-500">×</span>
              <input
                type="text"
                inputMode="numeric"
                value={s.reps}
                onChange={(e) => cambiarValor(idx, "reps", e.target.value)}
                onBlur={() => guardarValorAlSalir(idx, "reps")}
                placeholder={planificada?.reps || "reps"}
                className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-sm w-14 focus:outline-none focus:border-brand-500"
              />
              <span className="text-[10px] text-neutral-500 flex-shrink-0">
                reps
              </span>
              {planificada && (
                <span className="text-[10px] text-neutral-600 ml-auto truncate">
                  Plan: {planificada.peso || "—"} × {planificada.reps}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <div className="text-xs text-red-400 mt-2">{error}</div>
      )}
    </div>
  );
}
