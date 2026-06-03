"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FORMULARIO_INICIAL } from "@/lib/formulario-inicial";
import { guardarFormularioInicial } from "../acciones";
import { Confetti } from "@/components/confetti";
import { useToast } from "@/components/ui/toast";

export function FormularioInicial({
  respuestasIniciales,
  yaCompletado,
}: {
  respuestasIniciales: Record<string, string>;
  yaCompletado: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [respuestas, setRespuestas] =
    useState<Record<string, string>>(respuestasIniciales);
  const [error, setError] = useState<string | null>(null);
  const [celebrar, setCelebrar] = useState(false);
  const [enviando, startTransition] = useTransition();

  function set(id: string, valor: string) {
    setRespuestas((r) => ({ ...r, [id]: valor }));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await guardarFormularioInicial(respuestas, true);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCelebrar(true);
      setTimeout(() => setCelebrar(false), 3500);
      toast.success("¡Formulario enviado! ✓");
      router.push("/c/formularios");
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <Confetti trigger={celebrar} cantidad={40} duracion={2000} />

      {FORMULARIO_INICIAL.preguntas.map((p) => (
        <label key={p.id} className="block">
          <span className="block text-sm font-medium text-neutral-200 mb-1.5">
            {p.label}
          </span>
          {p.tipo === "parrafo" ? (
            <textarea
              value={respuestas[p.id] ?? ""}
              onChange={(e) => set(p.id, e.target.value)}
              placeholder={p.placeholder}
              rows={3}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
            />
          ) : (
            <div className="relative">
              <input
                type={
                  p.tipo === "numero"
                    ? "number"
                    : p.tipo === "fecha"
                      ? "date"
                      : "text"
                }
                inputMode={p.tipo === "numero" ? "decimal" : undefined}
                value={respuestas[p.id] ?? ""}
                onChange={(e) => set(p.id, e.target.value)}
                placeholder={p.placeholder}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              />
              {p.sufijo && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">
                  {p.sufijo}
                </span>
              )}
            </div>
          )}
        </label>
      ))}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition"
      >
        {enviando
          ? "Enviando…"
          : yaCompletado
            ? "Guardar cambios"
            : "Enviar a mi entrenador"}
      </button>
      {yaCompletado && (
        <p className="text-center text-xs text-neutral-500">
          Ya lo enviaste. Puedes actualizar tus respuestas cuando quieras.
        </p>
      )}
    </form>
  );
}
