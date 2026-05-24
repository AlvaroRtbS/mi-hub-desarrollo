"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarSesionCompletada } from "./acciones";
import { Confetti } from "@/components/confetti";

export function BotonCompletarSesion({
  clientaId,
  fecha,
  semana,
  dia,
  yaCompletada,
  sesionId,
}: {
  clientaId: string;
  fecha: string;
  semana: number;
  dia: number;
  yaCompletada: boolean;
  sesionId: string | null;
}) {
  const router = useRouter();
  const [completada, setCompletada] = useState(yaCompletada);
  const [celebrar, setCelebrar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function marcar() {
    if (completada) return;
    setError(null);
    startTransition(async () => {
      const r = await marcarSesionCompletada(
        clientaId,
        fecha,
        semana,
        dia,
        sesionId
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCompletada(true);
      setCelebrar(true);
      // Quita el confeti tras la animación para no acumular nodos en re-renders
      setTimeout(() => setCelebrar(false), 3500);
      // Recalcular logros tras completar
      try {
        await fetch("/api/gamificacion/recalcular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientaId }),
        });
      } catch {
        // best-effort
      }
      // Demora el refresh para que se vea la celebración antes
      setTimeout(() => router.refresh(), 800);
    });
  }

  if (completada) {
    return (
      <>
        <Confetti trigger={celebrar} />
        <div className="w-full text-center py-3 text-sm text-green-400 bg-green-950/30 border border-green-900/40 rounded-lg animate-in zoom-in-95">
          ✓ Entreno completado
        </div>
      </>
    );
  }

  return (
    <div>
      <button
        onClick={marcar}
        disabled={enviando}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg py-3 text-sm font-medium"
      >
        {enviando ? "Marcando..." : "✓ Marcar entreno como completado"}
      </button>
      {error && (
        <div className="text-xs text-red-400 mt-2 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
