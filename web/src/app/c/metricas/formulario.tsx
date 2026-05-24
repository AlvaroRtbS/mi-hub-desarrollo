"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarMiMetrica } from "./acciones";
import { Confetti } from "@/components/confetti";
import { useToast } from "@/components/ui/toast";

const TIPOS = [
  { id: "peso", label: "Peso", unidad: "kg" },
  { id: "perimetro_cintura", label: "Cintura", unidad: "cm" },
  { id: "perimetro_cadera", label: "Cadera", unidad: "cm" },
  { id: "perimetro_brazo", label: "Brazo", unidad: "cm" },
  { id: "porcentaje_grasa", label: "% grasa", unidad: "%" },
  { id: "masa_muscular", label: "Masa muscular", unidad: "kg" },
];

export function FormularioMiMetrica() {
  const router = useRouter();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState(TIPOS[0]!.id);
  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();
  const [celebrar, setCelebrar] = useState(false);

  const unidad = TIPOS.find((t) => t.id === tipo)?.unidad ?? "";

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = Number(valor);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Introduce un número válido");
      return;
    }
    startTransition(async () => {
      const r = await registrarMiMetrica(tipo, num, unidad, fecha, null);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setValor("");
      setAbierto(false);
      setCelebrar(true);
      setTimeout(() => setCelebrar(false), 3500);
      toast.success("Medida registrada ✓");
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <>
        <Confetti trigger={celebrar} cantidad={40} duracion={2000} />
        <button
          onClick={() => setAbierto(true)}
          className="w-full border border-dashed border-brand-900/50 bg-brand-950/10 text-brand-400 rounded-xl py-3 text-sm font-medium hover:bg-brand-950/30"
        >
          + Registrar medida
        </button>
      </>
    );
  }

  return (
    <form
      onSubmit={guardar}
      className="border border-neutral-800 rounded-2xl p-4 space-y-3 bg-neutral-900/50"
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Nueva medida</div>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-neutral-500 hover:text-white text-lg leading-none"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">Tipo</label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        >
          {TIPOS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-[1fr_4rem] gap-2">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Valor</label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0.0"
            autoFocus
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Unidad</label>
          <div className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-400">
            {unidad}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">Fecha</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium"
      >
        {enviando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
