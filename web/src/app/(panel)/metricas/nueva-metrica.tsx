"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { crearMetrica } from "./acciones";
import { hoyISO } from "@/lib/utilidades";

type ClientaBasica = {
  id: string;
  nombre: string;
  apellidos: string | null;
};

const TIPOS = [
  { valor: "peso", label: "Peso corporal", unidad: "kg" },
  { valor: "perimetro_cintura", label: "Perímetro cintura", unidad: "cm" },
  { valor: "perimetro_cadera", label: "Perímetro cadera", unidad: "cm" },
  { valor: "perimetro_brazo", label: "Perímetro brazo", unidad: "cm" },
  { valor: "porcentaje_grasa", label: "% grasa corporal", unidad: "%" },
  { valor: "masa_muscular", label: "Masa muscular", unidad: "kg" },
] as const;

export function NuevaMetricaBoton({ clientas }: { clientas: ClientaBasica[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [clientaId, setClientaId] = useState(clientas[0]?.id ?? "");
  const [tipo, setTipo] = useState<string>(TIPOS[0].valor);
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(() => hoyISO());
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const unidad = TIPOS.find((t) => t.valor === tipo)?.unidad ?? "";

  function guardar() {
    if (!clientaId) {
      setError("Selecciona una clienta.");
      return;
    }
    if (!valor) {
      setError("Introduce el valor.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("clienta_id", clientaId);
    fd.set("tipo", tipo);
    fd.set("valor", valor);
    fd.set("unidad", unidad);
    fd.set("fecha", fecha);
    fd.set("notas", notas);
    startTransition(async () => {
      const r = await crearMetrica(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setValor("");
      setNotas("");
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <>
      <Boton onClick={() => setAbierto(true)} disabled={clientas.length === 0}>
        + Nueva medida
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
              <h3 className="font-semibold">Nueva medida</h3>
              <button
                onClick={() => setAbierto(false)}
                className="text-neutral-500 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
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
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-sm text-neutral-300 mb-1">Tipo</span>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                >
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-[1fr_4rem] gap-2">
                <label className="block">
                  <span className="block text-sm text-neutral-300 mb-1">Valor</span>
                  <input
                    type="number"
                    step="0.1"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-neutral-300 mb-1">Unidad</span>
                  <div className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-500">
                    {unidad}
                  </div>
                </label>
              </div>

              <label className="block">
                <span className="block text-sm text-neutral-300 mb-1">Fecha</span>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </label>

              <label className="block">
                <span className="block text-sm text-neutral-300 mb-1">
                  Notas (opcional)
                </span>
                <input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Contexto, observaciones..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                />
              </label>

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
              <Boton onClick={guardar} disabled={enviando}>
                {enviando ? "Guardando..." : "Guardar"}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
