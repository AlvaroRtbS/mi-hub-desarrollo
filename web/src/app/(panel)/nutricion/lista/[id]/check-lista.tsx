"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Item = { id: string; nombre: string; comprado: boolean };

export function CheckListaInteractiva({
  listaId,
  items: itemsIniciales,
}: {
  listaId: string;
  items: Item[];
}) {
  const [items, setItems] = useState(itemsIniciales);
  const [guardando, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(idx: number) {
    const nuevos = items.map((it, i) =>
      i === idx ? { ...it, comprado: !it.comprado } : it
    );
    setItems(nuevos);
    setError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase
        .from("listas_compra")
        .update({ items: nuevos })
        .eq("id", listaId);
      if (err) {
        setError(err.message);
        setItems(items);
      }
    });
  }

  const total = items.length;
  const comprados = items.filter((i) => i.comprado).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-neutral-400">
          {comprados} de {total} marcados
          {guardando && " · guardando..."}
        </div>
        <div className="w-32 h-1.5 bg-neutral-800 rounded overflow-hidden">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: total > 0 ? `${(comprados / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={it.id}>
            <label className="flex items-center gap-3 cursor-pointer py-1.5 px-2 rounded hover:bg-neutral-900/50">
              <input
                type="checkbox"
                checked={it.comprado}
                onChange={() => toggle(i)}
                className="accent-brand-600 w-4 h-4"
              />
              <span
                className={
                  "text-sm flex-1 " +
                  (it.comprado ? "line-through text-neutral-600" : "text-neutral-200")
                }
              >
                {it.nombre}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {error && (
        <div className="text-sm text-red-400 mt-3 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
