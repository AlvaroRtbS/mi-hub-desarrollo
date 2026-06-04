"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { RESTRICCIONES_DIETETICAS, type DietaRestricciones } from "@/lib/dieta";
import { guardarPerfilDietetico } from "./acciones-dieta";

export function PerfilDietetico({
  clientaId,
  inicial,
}: {
  clientaId: string;
  inicial: DietaRestricciones;
}) {
  const router = useRouter();
  const [flags, setFlags] = useState<string[]>(inicial.flags ?? []);
  const [notas, setNotas] = useState(inicial.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [guardando, startTransition] = useTransition();

  function toggle(key: string) {
    setGuardado(false);
    setFlags((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await guardarPerfilDietetico(clientaId, { flags, notas });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setGuardado(true);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {RESTRICCIONES_DIETETICAS.map((r) => {
          const activo = flags.includes(r.key);
          return (
            <button
              key={r.key}
              onClick={() => toggle(r.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                activo
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-600"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <textarea
        value={notas}
        onChange={(e) => {
          setNotas(e.target.value);
          setGuardado(false);
        }}
        placeholder="Otras alergias o cosas que no le gustan (ej: no le gusta el brócoli, alergia al kiwi)…"
        rows={2}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
      />

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mt-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 mt-2">
        {guardado && <span className="text-xs text-emerald-400">Guardado ✓</span>}
        <Boton onClick={guardar} tamano="sm" disabled={guardando}>
          {guardando ? "..." : "Guardar perfil"}
        </Boton>
      </div>
    </div>
  );
}
