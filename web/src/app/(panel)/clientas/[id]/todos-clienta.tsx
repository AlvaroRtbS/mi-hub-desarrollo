"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { crearTodo, alternarTodo, eliminarTodo } from "./acciones-todos";
import { hoyISO } from "@/lib/utilidades";

type Todo = {
  id: string;
  titulo: string;
  completado: boolean;
  fecha_limite: string | null;
  completado_en: string | null;
  creado_en: string;
};

export function TodosClienta({
  clientaId,
  todos,
}: {
  clientaId: string;
  todos: Todo[];
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function añadir(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setError(null);
    const t = titulo;
    const f = fecha;
    setTitulo("");
    setFecha("");
    startTransition(async () => {
      const r = await crearTodo(clientaId, t, f || null);
      if (!r.ok) {
        setError(r.error);
        setTitulo(t);
        setFecha(f);
        return;
      }
      router.refresh();
    });
  }

  function alternar(id: string, completado: boolean) {
    startTransition(async () => {
      await alternarTodo(id, clientaId, completado);
      router.refresh();
    });
  }

  function quitar(id: string) {
    startTransition(async () => {
      await eliminarTodo(id, clientaId);
      router.refresh();
    });
  }

  const pendientes = todos.filter((t) => !t.completado);
  const completados = todos.filter((t) => t.completado);

  return (
    <div>
      <form onSubmit={añadir} className="mb-4 flex gap-2">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Nueva tarea (ej. 'Pedir fotos el lunes')"
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-brand-500"
          title="Fecha límite (opcional)"
        />
        <Boton type="submit" tamano="sm" disabled={enviando || !titulo.trim()}>
          {enviando ? "..." : "Añadir"}
        </Boton>
      </form>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-3">
          {error}
        </div>
      )}

      {pendientes.length === 0 && completados.length === 0 ? (
        <div className="text-xs text-neutral-600 italic">
          Sin tareas pendientes. Apunta cosas que tengas que hacer sobre esta clienta.
        </div>
      ) : (
        <>
          <ul className="space-y-1.5">
            {pendientes.map((t) => (
              <TodoFila
                key={t.id}
                todo={t}
                onAlternar={() => alternar(t.id, true)}
                onEliminar={() => quitar(t.id)}
              />
            ))}
          </ul>

          {completados.length > 0 && (
            <details className="pt-3 mt-3 border-t border-neutral-900">
              <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-300">
                Completadas ({completados.length})
              </summary>
              <ul className="space-y-1.5 mt-2">
                {completados.map((t) => (
                  <TodoFila
                    key={t.id}
                    todo={t}
                    onAlternar={() => alternar(t.id, false)}
                    onEliminar={() => quitar(t.id)}
                  />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function TodoFila({
  todo,
  onAlternar,
  onEliminar,
}: {
  todo: Todo;
  onAlternar: () => void;
  onEliminar: () => void;
}) {
  const vencida =
    !todo.completado &&
    todo.fecha_limite &&
    new Date(todo.fecha_limite) < new Date(hoyISO());

  return (
    <li className="group flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-neutral-900/50 transition">
      <button
        onClick={onAlternar}
        className={
          "mt-0.5 w-4 h-4 rounded border flex-shrink-0 transition flex items-center justify-center " +
          (todo.completado
            ? "bg-brand-600 border-brand-600 text-white"
            : "border-neutral-700 hover:border-brand-500")
        }
        aria-label={todo.completado ? "Marcar pendiente" : "Marcar completada"}
      >
        {todo.completado && <span className="text-[10px] leading-none">✓</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={
            "text-sm " +
            (todo.completado ? "text-neutral-500 line-through" : "text-neutral-100")
          }
        >
          {todo.titulo}
        </div>
        {todo.fecha_limite && (
          <div
            className={
              "text-[10px] mt-0.5 " +
              (vencida ? "text-red-400" : "text-neutral-500")
            }
          >
            {formatearFechaLimite(todo.fecha_limite, vencida === true)}
          </div>
        )}
      </div>
      <button
        onClick={onEliminar}
        className="text-[10px] text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
        aria-label="Eliminar"
      >
        ✕
      </button>
    </li>
  );
}

function formatearFechaLimite(iso: string, vencida: boolean): string {
  const f = new Date(iso);
  const hoy = new Date(hoyISO());
  const dias = Math.round((f.getTime() - hoy.getTime()) / 86400000);
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence mañana";
  if (dias > 0 && dias < 7) return `En ${dias} días`;
  if (vencida) return `Vencida hace ${-dias} días`;
  return f.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: f.getFullYear() !== hoy.getFullYear() ? "numeric" : undefined,
  });
}
