"use client";

import { useState } from "react";
import { CalendarRange } from "lucide-react";

export function BotonInformeSemanal() {
  const [estado, setEstado] = useState<"idle" | "cargando" | "ok" | "error">("idle");
  const [informe, setInforme] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generar() {
    setEstado("cargando");
    setError(null);
    try {
      const r = await fetch("/api/ia/informe-semanal", { method: "POST" });
      const data = await r.json();
      if (!data.ok) {
        setError(data.error ?? "Error desconocido");
        setEstado("error");
        return;
      }
      setInforme(data.informe);
      setEstado("ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
      setEstado("error");
    }
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="size-4" style={{ color: "var(--brand)" }} />
          <h2 className="font-semibold">Informe semanal</h2>
        </div>
        <button
          onClick={generar}
          disabled={estado === "cargando"}
          className="text-xs text-brand-500 hover:text-brand-400 disabled:opacity-50"
        >
          {estado === "cargando"
            ? "Generando..."
            : informe
              ? "Volver a generar"
              : "Generar informe"}
        </button>
      </div>

      {!informe && estado === "idle" && (
        <div className="text-xs text-neutral-500">
          Un brief de los últimos 7 días de todas tus clientas (entrenos, peso,
          pasos, check-in, mensajes) con prioridades para la semana. Generado con
          IA en una sola pasada.
        </div>
      )}

      {estado === "cargando" && (
        <div className="text-sm text-neutral-500 animate-pulse">
          Analizando la semana de todas tus clientas...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {informe && (
        <div className="prose prose-invert prose-sm max-w-none text-sm text-neutral-200 whitespace-pre-wrap">
          {informe}
        </div>
      )}
    </div>
  );
}
