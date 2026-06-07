"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { editarMiMetrica, borrarMiMetrica } from "./acciones-metricas";

type Entry = { id: string; valor: number; fecha: string };

function fechaCorta(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}

/** Lista plegable de los registros de UN tipo de métrica, con editar/borrar. */
export function RegistrosMetrica({
  unidad,
  entries,
}: {
  unidad: string;
  entries: Entry[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValor, setEditValor] = useState("");
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function empezarEdicion(e: Entry) {
    setEditId(e.id);
    setEditValor(String(e.valor));
    setError(null);
  }

  function guardar(id: string) {
    const v = parseFloat(editValor.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) {
      setError("Número inválido.");
      return;
    }
    start(async () => {
      const r = await editarMiMetrica(id, v);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEditId(null);
      router.refresh();
    });
  }

  function borrar(id: string) {
    if (!confirm("¿Borrar esta medida?")) return;
    setError(null);
    start(async () => {
      const r = await borrarMiMetrica(id);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="text-[10px] text-neutral-500 hover:text-neutral-300"
      >
        {entries.length} {entries.length === 1 ? "medida" : "medidas"} ·{" "}
        {abierto ? "ocultar" : "editar / borrar"}
      </button>

      {abierto && (
        <ul className="mt-2 space-y-1 border-t border-neutral-900 pt-2">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500 w-16 shrink-0">
                {fechaCorta(e.fecha)}
              </span>
              {editId === e.id ? (
                <>
                  <input
                    value={editValor}
                    onChange={(ev) => setEditValor(ev.target.value)}
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    className="w-16 bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-neutral-100 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-neutral-600">{unidad}</span>
                  <button
                    onClick={() => guardar(e.id)}
                    disabled={pendiente}
                    className="text-brand-500 disabled:opacity-40 ml-auto"
                    aria-label="Guardar"
                  >
                    <Check className="size-4" />
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="text-neutral-500"
                    aria-label="Cancelar"
                  >
                    <X className="size-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-neutral-200 flex-1">
                    {e.valor} {unidad}
                  </span>
                  <button
                    onClick={() => empezarEdicion(e)}
                    className="text-neutral-500 hover:text-neutral-200"
                    aria-label="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => borrar(e.id)}
                    disabled={pendiente}
                    className="text-neutral-500 hover:text-red-400 disabled:opacity-40"
                    aria-label="Borrar"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <div className="text-[10px] text-red-400 mt-1">{error}</div>}
    </div>
  );
}
