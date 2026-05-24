"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TarjetaEjercicio } from "./tarjeta-ejercicio";
import { Boton } from "@/components/ui/boton";
import { useToast } from "@/components/ui/toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CheckSquare, Square, Trash2, X } from "lucide-react";

type Ejercicio = {
  id: string;
  nombre: string;
  grupos_musculares: string[];
  imagen_url: string | null;
  video_url: string | null;
  imagenFirmada: string | null;
  videoFirmado: string | null;
};

export function Biblioteca({ ejercicios }: { ejercicios: Ejercicio[] }) {
  const router = useRouter();
  const toast = useToast();
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [borrando, startBorrar] = useTransition();
  const supabase = createSupabaseBrowserClient();

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function seleccionarTodos() {
    setSeleccionados(new Set(ejercicios.map((e) => e.id)));
  }

  function deseleccionarTodos() {
    setSeleccionados(new Set());
  }

  function salirModoSeleccion() {
    setModoSeleccion(false);
    setSeleccionados(new Set());
  }

  function borrarSeleccionados() {
    if (seleccionados.size === 0) return;
    const n = seleccionados.size;
    const msg =
      n === 1
        ? "¿Borrar este ejercicio? No se puede deshacer."
        : `¿Borrar ${n} ejercicios? No se puede deshacer.`;
    if (!confirm(msg)) return;

    startBorrar(async () => {
      const ids = Array.from(seleccionados);
      const { error } = await supabase
        .from("ejercicios")
        .delete()
        .in("id", ids);
      if (error) {
        toast.error(`No se pudo borrar: ${error.message}`);
        return;
      }
      toast.success(`${n} ejercicio${n === 1 ? "" : "s"} borrado${n === 1 ? "" : "s"}`);
      salirModoSeleccion();
      router.refresh();
    });
  }

  const todosSeleccionados =
    seleccionados.size > 0 && seleccionados.size === ejercicios.length;

  return (
    <>
      <div className="flex items-center justify-end gap-2 mb-3">
        {modoSeleccion ? (
          <>
            <button
              onClick={
                todosSeleccionados ? deseleccionarTodos : seleccionarTodos
              }
              className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1"
            >
              {todosSeleccionados ? (
                <CheckSquare className="size-4" />
              ) : (
                <Square className="size-4" />
              )}
              {todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
            <button
              onClick={salirModoSeleccion}
              className="text-xs text-neutral-500 hover:text-white inline-flex items-center gap-1"
            >
              <X className="size-4" />
              Salir
            </button>
          </>
        ) : (
          <button
            onClick={() => setModoSeleccion(true)}
            className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1"
          >
            <CheckSquare className="size-4" />
            Selección múltiple
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {ejercicios.map((e) => {
          const elegido = seleccionados.has(e.id);
          if (modoSeleccion) {
            return (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                className={
                  "relative text-left bg-neutral-950 border rounded-xl overflow-hidden transition " +
                  (elegido
                    ? "border-2 border-transparent"
                    : "border border-neutral-800 hover:border-neutral-700")
                }
                style={
                  elegido
                    ? { borderColor: "var(--brand)", boxShadow: "0 0 0 2px var(--brand)" }
                    : undefined
                }
              >
                <div
                  className={
                    "absolute top-2 left-2 z-10 size-6 rounded-md border-2 grid place-items-center transition " +
                    (elegido ? "" : "bg-black/60 border-white/40")
                  }
                  style={
                    elegido
                      ? { backgroundColor: "var(--brand)", borderColor: "var(--brand)" }
                      : undefined
                  }
                >
                  {elegido && (
                    <svg className="size-3.5 text-white" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 8.5L6 12.5L14 4"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="aspect-[4/3] bg-neutral-900 relative">
                  {e.imagenFirmada ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.imagenFirmada}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-neutral-700 text-xs">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div
                    className="text-sm font-medium line-clamp-2"
                    title={e.nombre}
                  >
                    {e.nombre}
                  </div>
                </div>
              </button>
            );
          }
          return (
            <TarjetaEjercicio
              key={e.id}
              href={`/ejercicios/${e.id}/editar`}
              nombre={e.nombre}
              imagenUrl={e.imagenFirmada}
              videoUrl={e.videoFirmado}
              grupos={e.grupos_musculares}
            />
          );
        })}
      </div>

      {/* Barra de acciones flotante */}
      {modoSeleccion && seleccionados.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full pl-4 pr-2 py-2 shadow-2xl animate-in slide-in-from-bottom-2 fade-in">
          <span className="text-sm">
            <strong>{seleccionados.size}</strong> seleccionado
            {seleccionados.size === 1 ? "" : "s"}
          </span>
          <Boton
            onClick={borrarSeleccionados}
            disabled={borrando}
            variante="secundario"
            tamano="sm"
          >
            <Trash2 className="size-4 mr-1 inline" />
            {borrando ? "Borrando…" : "Borrar"}
          </Boton>
          <button
            onClick={salirModoSeleccion}
            className="text-neutral-400 hover:text-white p-1.5"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
