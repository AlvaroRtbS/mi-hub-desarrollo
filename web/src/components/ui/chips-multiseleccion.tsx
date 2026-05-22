"use client";

import { useState } from "react";
import { clasesCondicionales } from "@/lib/utilidades";

export function ChipsMultiseleccion({
  nombre,
  opciones,
  valorInicial = [],
}: {
  nombre: string;
  opciones: readonly string[];
  valorInicial?: string[];
}) {
  const [seleccionados, setSeleccionados] = useState<string[]>(valorInicial);

  function alternar(op: string) {
    setSeleccionados((s) =>
      s.includes(op) ? s.filter((x) => x !== op) : [...s, op]
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {opciones.map((op) => {
          const activo = seleccionados.includes(op);
          return (
            <button
              type="button"
              key={op}
              onClick={() => alternar(op)}
              className={clasesCondicionales(
                "text-xs px-3 py-1.5 rounded-full border transition",
                activo
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500"
              )}
            >
              {op}
            </button>
          );
        })}
      </div>
      {seleccionados.map((s) => (
        <input key={s} type="hidden" name={nombre} value={s} />
      ))}
    </div>
  );
}
