"use client";

import { useState } from "react";

export function BotonResumenIA({ clientaId }: { clientaId: string }) {
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "error">("idle");
  const [resumen, setResumen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    setEstado("cargando");
    setError(null);
    try {
      const r = await fetch("/api/ia/resumen-clienta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientaId }),
      });
      const data = await r.json();
      if (!data.ok) {
        setError(data.error ?? "Error desconocido");
        setEstado("error");
        return;
      }
      setResumen(data.resumen);
      setEstado("ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
      setEstado("error");
    }
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">🧠 Resumen IA</h3>
        <button
          onClick={generar}
          disabled={estado === "cargando"}
          className="text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50"
        >
          {estado === "cargando"
            ? "Generando..."
            : resumen
            ? "Volver a generar"
            : "Generar resumen"}
        </button>
      </div>

      {!resumen && estado === "idle" && (
        <div className="text-xs text-neutral-500">
          Un brief generado por Claude con la situación actual de la clienta
          (programa, adherencia, mensajes, notas). Útil antes de hablar con
          ella.
        </div>
      )}

      {estado === "cargando" && (
        <div className="text-sm text-neutral-500 animate-pulse">
          Analizando datos...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {resumen && (
        <div className="prose prose-invert prose-sm max-w-none text-sm text-neutral-200 whitespace-pre-wrap">
          {resumen}
        </div>
      )}
    </div>
  );
}
