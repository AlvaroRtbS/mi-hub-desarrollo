"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { CATEGORIAS, type CategoriaRacion } from "@/lib/nutricion";
import {
  actualizarAlimento,
  crearAlimento,
  eliminarAlimento,
} from "../acciones-extra";

type Alimento = {
  id: string;
  categoria: CategoriaRacion;
  subgrupo: string | null;
  alimento: string;
  cantidad: string;
  notas: string | null;
};

const inputCls =
  "bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:border-neutral-500";

function FilaEditable({ a }: { a: Alimento }) {
  const [editando, setEditando] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState(a.alimento);
  const [cantidad, setCantidad] = useState(a.cantidad);
  const [notas, setNotas] = useState(a.notas ?? "");

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await actualizarAlimento(a.id, {
        categoria: a.categoria,
        subgrupo: a.subgrupo ?? "",
        alimento: nombre,
        cantidad,
        notas,
      });
      if (!r.ok) setError(r.error);
      else setEditando(false);
    });
  }

  function borrar() {
    if (!confirm(`¿Eliminar "${a.alimento}" de la tabla?`)) return;
    startTransition(async () => {
      const r = await eliminarAlimento(a.id);
      if (!r.ok) setError(r.error);
    });
  }

  if (!editando) {
    return (
      <div className="flex items-baseline gap-3 px-3 py-2 text-sm group">
        <span className="flex-1">{a.alimento}</span>
        <span className="text-neutral-300 shrink-0">{a.cantidad}</span>
        {a.notas && (
          <span className="text-xs text-neutral-500 shrink-0 hidden sm:inline">
            {a.notas}
          </span>
        )}
        <span className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => setEditando(true)}
            className="p-1 text-neutral-500 hover:text-neutral-200"
            aria-label="Editar"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={borrar}
            disabled={pendiente}
            className="p-1 text-neutral-500 hover:text-red-400"
            aria-label="Eliminar"
          >
            <Trash2 className="size-3.5" />
          </button>
        </span>
        {error && <span className="text-xs text-amber-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
      <input value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={inputCls + " max-w-[10rem]"} />
      <input
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Notas"
        className={inputCls + " max-w-[10rem] hidden sm:block"}
      />
      <button onClick={guardar} disabled={pendiente} className="p-1 text-green-400" aria-label="Guardar">
        <Check className="size-4" />
      </button>
      <button onClick={() => setEditando(false)} className="p-1 text-neutral-500" aria-label="Cancelar">
        <X className="size-4" />
      </button>
      {error && <span className="text-xs text-amber-400">{error}</span>}
    </div>
  );
}

function FormNuevo({ categoria }: { categoria: CategoriaRacion }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [subgrupo, setSubgrupo] = useState("");
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");

  function crear() {
    setError(null);
    startTransition(async () => {
      const r = await crearAlimento({
        categoria,
        subgrupo,
        alimento: nombre,
        cantidad,
        notas: "",
      });
      if (!r.ok) setError(r.error);
      else {
        setNombre("");
        setCantidad("");
        setAbierto(false);
      }
    });
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 mt-2"
      >
        <Plus className="size-3.5" /> Añadir alimento
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 p-2 rounded-xl border border-neutral-800 bg-neutral-900/40">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Alimento"
        className={inputCls + " max-w-[14rem]"}
      />
      <input
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        placeholder="Cantidad por ración (ej. 50 g)"
        className={inputCls + " max-w-[14rem]"}
      />
      <input
        value={subgrupo}
        onChange={(e) => setSubgrupo(e.target.value)}
        placeholder="Subgrupo (opcional)"
        className={inputCls + " max-w-[10rem]"}
      />
      <button
        onClick={crear}
        disabled={pendiente}
        className="text-xs px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--brand)" }}
      >
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
      <button onClick={() => setAbierto(false)} className="text-xs text-neutral-500">
        Cancelar
      </button>
      {error && <span className="text-xs text-amber-400 w-full">{error}</span>}
    </div>
  );
}

export function EditorAlimentos({ alimentos }: { alimentos: Alimento[] }) {
  return (
    <div className="space-y-8">
      {CATEGORIAS.map((c) => {
        const delCat = alimentos.filter((a) => a.categoria === c.cat);
        const porSubgrupo = new Map<string, Alimento[]>();
        for (const a of delCat) {
          const k = a.subgrupo ?? "Otros";
          porSubgrupo.set(k, [...(porSubgrupo.get(k) ?? []), a]);
        }
        return (
          <section key={c.cat}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="size-3 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </h2>
            {delCat.length === 0 ? (
              <p className="text-xs text-neutral-600">Sin alimentos en este grupo.</p>
            ) : (
              <div className="space-y-4">
                {[...porSubgrupo.entries()].map(([sub, items]) => (
                  <div key={sub}>
                    <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1.5">
                      {sub}
                    </div>
                    <div className="rounded-xl border border-neutral-800 divide-y divide-neutral-800/70">
                      {items.map((a) => (
                        <FilaEditable key={a.id} a={a} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <FormNuevo categoria={c.cat} />
          </section>
        );
      })}
    </div>
  );
}
