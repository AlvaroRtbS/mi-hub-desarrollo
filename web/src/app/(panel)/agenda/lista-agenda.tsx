"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hoyISO } from "@/lib/utilidades";
import {
  crearTareaCoach,
  alternarTareaCoach,
  eliminarTareaCoach,
} from "./acciones";
import type { TareaCoach } from "@/lib/supabase/tipos";

type Filtro = "pendientes" | "hechas" | "todas";

function fmtFecha(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

export function ListaAgenda({ tareas }: { tareas: TareaCoach[] }) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("pendientes");
  const [texto, setTexto] = useState("");
  const [vence, setVence] = useState("");

  const hoy = hoyISO();

  function accion(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "Error.");
      router.refresh();
    });
  }

  function onAdd() {
    if (!texto.trim()) return;
    setError(null);
    iniciar(async () => {
      const r = await crearTareaCoach(texto, vence || null);
      if (!r.ok) return setError(r.error);
      setTexto("");
      setVence("");
      router.refresh();
    });
  }

  const visibles = tareas.filter((t) =>
    filtro === "todas" ? true : filtro === "hechas" ? t.hecha : !t.hecha
  );
  const pendientes = tareas.filter((t) => !t.hecha).length;

  return (
    <div className="space-y-5">
      {/* Añadir */}
      <div className="border border-neutral-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd();
            }}
            placeholder="Nueva tarea… (p. ej. llamar a Marta, preparar plan de Ana)"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
          <input
            type="date"
            value={vence}
            onChange={(e) => setVence(e.target.value)}
            title="Vencimiento (opcional)"
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={onAdd}
            disabled={guardando || !texto.trim()}
            className="text-sm font-medium text-white rounded-lg px-4 py-2 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand)" }}
          >
            Añadir
          </button>
        </div>
        {error && (
          <div className="text-xs text-red-400 mt-2">{error}</div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-1 text-sm">
        {(["pendientes", "hechas", "todas"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={
              "px-3 py-1.5 rounded-lg border capitalize " +
              (filtro === f
                ? "bg-neutral-800 border-neutral-700 text-white"
                : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900")
            }
          >
            {f}
            {f === "pendientes" && pendientes > 0 ? ` (${pendientes})` : ""}
          </button>
        ))}
      </div>

      {/* Lista */}
      {visibles.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {filtro === "pendientes" ? "Sin tareas pendientes. 👌" : "Nada por aquí."}
        </p>
      ) : (
        <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-2xl overflow-hidden">
          {visibles.map((t) => {
            const vencida = !t.hecha && t.vence && t.vence < hoy;
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={t.hecha}
                  disabled={guardando}
                  onChange={() => accion(() => alternarTareaCoach(t.id, !t.hecha))}
                  className="size-4 accent-[var(--brand)] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className={"text-sm " + (t.hecha ? "line-through text-neutral-500" : "")}>
                    {t.texto}
                  </div>
                  {t.vence && (
                    <div className={"text-xs " + (vencida ? "text-red-400" : "text-neutral-500")}>
                      {vencida ? "venció " : "vence "}
                      {fmtFecha(t.vence)}
                    </div>
                  )}
                </div>
                <button
                  disabled={guardando}
                  title="Eliminar"
                  onClick={() => accion(() => eliminarTareaCoach(t.id))}
                  className="text-xs px-2 py-1 rounded-lg border border-neutral-700 text-neutral-400 hover:border-red-700 hover:text-red-400 shrink-0"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
