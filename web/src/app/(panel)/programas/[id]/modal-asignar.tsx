"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { asignarPrograma } from "../acciones";

type ClientaBasica = {
  id: string;
  nombre: string;
  apellidos: string | null;
  estado: string;
};

type Props = {
  programaId: string;
  clientas: ClientaBasica[];
  onCerrar: () => void;
  onAsignado: () => void;
};

export function ModalAsignar({ programaId, clientas, onCerrar, onAsignado }: Props) {
  const [clientaId, setClientaId] = useState<string>(clientas[0]?.id ?? "");
  const [fecha, setFecha] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().slice(0, 10);
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function onAsignar() {
    if (!clientaId) {
      setError("Selecciona una clienta.");
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
      onAsignado();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="font-semibold">Asignar programa</h3>
          <button
            onClick={onCerrar}
            className="text-neutral-500 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {clientas.length === 0 ? (
            <div className="text-sm text-neutral-400">
              Aún no tienes clientas. Crea una en{" "}
              <a href="/clientas/nueva" className="text-brand-500">
                Clientas → Añadir clienta
              </a>
              .
            </div>
          ) : (
            <>
              <label className="block">
                <span className="block text-sm text-neutral-300 mb-1">Clienta</span>
                <select
                  value={clientaId}
                  onChange={(e) => setClientaId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                >
                  {clientas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {c.apellidos ?? ""}
                      {c.estado === "invitada" ? " (invitada)" : ""}
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

              {error && (
                <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="text-xs text-neutral-500">
                Se creará una copia del programa en el calendario de la clienta. Si más
                adelante editas la plantilla, la asignación en curso no se ve afectada.
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-neutral-800 flex justify-end gap-2">
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            onClick={onAsignar}
            disabled={enviando || clientas.length === 0 || !clientaId}
          >
            {enviando ? "Asignando..." : "Asignar"}
          </Boton>
        </div>
      </div>
    </div>
  );
}
