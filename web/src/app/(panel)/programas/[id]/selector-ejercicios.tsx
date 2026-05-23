"use client";

import { useMemo, useState } from "react";
import type { Ejercicio } from "@/lib/supabase/tipos";

type EjercicioBiblio = Pick<
  Ejercicio,
  "id" | "nombre" | "descripcion" | "grupos_musculares" | "material" | "video_url" | "imagen_url"
>;

type Props = {
  ejercicios: EjercicioBiblio[];
  usados: Map<string, number>;
  onElegir: (e: EjercicioBiblio) => void;
  onCerrar: () => void;
};

export function SelectorEjercicios({ ejercicios, usados, onElegir, onCerrar }: Props) {
  const [q, setQ] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState<string | null>(null);

  const gruposDisponibles = useMemo(() => {
    const set = new Set<string>();
    ejercicios.forEach((e) => e.grupos_musculares?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [ejercicios]);

  const filtrados = useMemo(() => {
    const qLower = q.toLowerCase();
    return ejercicios.filter((e) => {
      if (qLower && !e.nombre.toLowerCase().includes(qLower)) return false;
      if (filtroGrupo && !e.grupos_musculares?.includes(filtroGrupo)) return false;
      return true;
    });
  }, [ejercicios, q, filtroGrupo]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="font-semibold">Elegir ejercicio</h3>
          <button
            onClick={onCerrar}
            className="text-neutral-500 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-3 border-b border-neutral-800 space-y-2">
          <input
            type="search"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ejercicio por nombre..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
          {gruposDisponibles.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFiltroGrupo(null)}
                className={
                  "text-xs px-2 py-1 rounded-full border " +
                  (filtroGrupo === null
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-neutral-800 text-neutral-400 hover:text-white")
                }
              >
                Todos
              </button>
              {gruposDisponibles.map((g) => (
                <button
                  key={g}
                  onClick={() => setFiltroGrupo(g)}
                  className={
                    "text-xs px-2 py-1 rounded-full border " +
                    (filtroGrupo === g
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "border-neutral-800 text-neutral-400 hover:text-white")
                  }
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-neutral-500">
              {ejercicios.length === 0 ? (
                <>
                  Aún no tienes ejercicios en tu biblioteca.
                  <br />
                  Crea uno en{" "}
                  <a href="/ejercicios/nuevo" className="text-brand-500">
                    Ejercicios → Crear
                  </a>
                  .
                </>
              ) : (
                "Ningún ejercicio coincide."
              )}
            </div>
          ) : (
            <div>
              {filtrados.map((e) => {
                const veces = usados.get(e.id);
                return (
                  <button
                    key={e.id}
                    onClick={() => onElegir(e)}
                    className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-neutral-900/50 border-b border-neutral-900"
                  >
                    <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex-shrink-0 flex items-center justify-center text-neutral-700 text-xs">
                      {e.video_url ? "▶" : "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        {e.nombre}
                        {veces && (
                          <span className="text-[10px] text-neutral-500 font-normal">
                            (usado {veces}x)
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {e.grupos_musculares?.slice(0, 3).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-500"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
