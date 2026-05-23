"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";

export function BotonGenerarIA({ clientaId }: { clientaId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [instrucciones, setInstrucciones] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    if (!instrucciones.trim()) {
      setError("Escribe instrucciones para la IA.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/ia/generar-programa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientaId, instrucciones }),
      });
      const data = await r.json();
      if (!data.ok) {
        setError(data.error ?? "Error generando programa.");
        return;
      }
      router.push(`/programas/${data.programaId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="text-xs text-brand-500 hover:text-brand-400"
      >
        ✨ Generar programa con IA
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => !enviando && setAbierto(false)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-semibold">✨ Generar programa con IA</h3>
              <button
                onClick={() => !enviando && setAbierto(false)}
                className="text-neutral-500 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block text-sm text-neutral-300">
                Instrucciones para la IA
              </label>
              <textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                rows={8}
                placeholder="Ej: Plan de 4 semanas, 4 días/semana, énfasis en glúteo. Entrena en casa con mancuernas hasta 12kg y bandas. Juega al fútbol los miércoles. Sin antecedentes de lesión."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
                disabled={enviando}
              />

              <div className="text-xs text-neutral-500">
                Se usará la ficha de la clienta (edad, notas, ejercicios de tu
                biblioteca) + estas instrucciones. La IA crea un programa
                completo que podrás editar antes de asignarlo.
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-neutral-800 flex justify-end gap-2">
              <Boton
                variante="secundario"
                onClick={() => setAbierto(false)}
                disabled={enviando}
              >
                Cancelar
              </Boton>
              <Boton onClick={generar} disabled={enviando}>
                {enviando ? "Generando (~30s)..." : "Generar"}
              </Boton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
