"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { asignarPrograma } from "../../programas/acciones";
import { hoyISO } from "@/lib/utilidades";

type ProgramaOpcion = {
  id: string;
  nombre: string;
  num_semanas: number;
};

export function BotonAsignar({
  clientaId,
  tieneActiva,
}: {
  clientaId: string;
  tieneActiva: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [programas, setProgramas] = useState<ProgramaOpcion[]>([]);
  const [cargandoLista, setCargandoLista] = useState(false);
  const [programaId, setProgramaId] = useState<string>("");
  const [fecha, setFecha] = useState(() => hoyISO());
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  useEffect(() => {
    if (!abierto) return;
    setCargandoLista(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("programas")
      .select("id, nombre, num_semanas")
      .order("actualizado_en", { ascending: false })
      .then(({ data, error: err }) => {
        setCargandoLista(false);
        if (err) {
          setError(err.message);
          return;
        }
        const list = (data ?? []) as ProgramaOpcion[];
        setProgramas(list);
        setProgramaId(list[0]?.id ?? "");
      });
  }, [abierto]);

  function onAsignar() {
    if (!programaId) {
      setError("Selecciona un programa.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("programa_id", programaId);
      fd.set("clienta_id", clientaId);
      fd.set("fecha_inicio", fecha);
      const r = await asignarPrograma(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAbierto(false);
      // Llevar directamente al editor per-clienta tras asignar:
      // es el flujo natural — recién asignado, la coach probablemente
      // quiere personalizar el plan para esta clienta concreta.
      router.push(`/clientas/${clientaId}/programa`);
      router.refresh();
    });
  }

  return (
    <>
      <Boton variante="secundario" tamano="sm" onClick={() => setAbierto(true)}>
        {tieneActiva ? "Cambiar programa" : "Asignar programa"}
      </Boton>

      {abierto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setAbierto(false)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">
                {tieneActiva ? "Cambiar programa" : "Asignar programa"}
              </h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-neutral-500 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {cargandoLista ? (
                <div className="text-sm text-neutral-500">Cargando programas...</div>
              ) : programas.length === 0 ? (
                <div className="text-sm text-neutral-400">
                  Aún no tienes programas. Crea uno en{" "}
                  <a href="/programas/nuevo" className="text-brand-500">
                    Programas → Crear programa
                  </a>
                  .
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="block text-sm text-neutral-300 mb-1">
                      Programa
                    </span>
                    <select
                      value={programaId}
                      onChange={(e) => setProgramaId(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                    >
                      {programas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.num_semanas} sem)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="block text-sm text-neutral-300 mb-1">
                      Fecha de inicio
                    </span>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                    />
                  </label>

                  {tieneActiva && (
                    <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2">
                      Esta clienta ya tiene un programa activo. Al asignar el nuevo,
                      el anterior se desactivará automáticamente (queda en el historial).
                    </div>
                  )}
                </>
              )}

              {error && (
                <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-neutral-800 flex justify-end gap-2">
              <Boton variante="secundario" onClick={() => setAbierto(false)}>
                Cancelar
              </Boton>
              <Boton
                onClick={onAsignar}
                disabled={enviando || programas.length === 0 || !programaId}
              >
                {enviando ? "Asignando..." : "Asignar"}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
