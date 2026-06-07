"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";

// #5 — Glosario contextual. Términos del método que pueden ser nuevos para la
// clienta. Tap para abrir (no hover → funciona bien en móvil).
const GLOSARIO: Record<string, { titulo: string; texto: string }> = {
  rir: {
    titulo: "RIR",
    texto:
      "Repeticiones en reserva: cuántas más podrías hacer al acabar la serie. RIR 2 = te pararías a 2 de no poder más. Ajusta el peso para que cuadre.",
  },
  racion: {
    titulo: "Ración",
    texto:
      "Una porción de un grupo de alimentos. Puedes cambiar una ración por otra del MISMO grupo: misma ración = mismo aporte. Por eso puedes variar sin descuadrar el plan.",
  },
  adherencia: {
    titulo: "Adherencia",
    texto:
      "El % de entrenos que completas de los que tenías planificados. Lo que mueve la aguja es la constancia, no la perfección.",
  },
  esfuerzo: {
    titulo: "Esfuerzo",
    texto:
      "Cómo de duro sentiste el entreno, del 1 (muy suave) al 5 (al límite). Le sirve a tu entrenador para ajustar las cargas.",
  },
  energia: {
    titulo: "Energía",
    texto:
      "Cómo de con energía te sentías, del 1 (agotada) al 5 (a tope). Ayuda a ver tu descanso y recuperación.",
  },
  checkin: {
    titulo: "Check-in",
    texto:
      "Tu repaso semanal: cómo te has sentido, peso, energía y comentarios. Una vez por semana, para ir afinando el plan.",
  },
};

export function Glosario({ termino }: { termino: string }) {
  const [abierto, setAbierto] = useState(false);
  const def = GLOSARIO[termino];
  if (!def) return null;

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Qué es ${def.titulo}`}
        className="text-neutral-500 hover:text-neutral-300"
      >
        <HelpCircle className="size-3.5" />
      </button>
      {abierto && (
        <>
          <span
            className="fixed inset-0 z-40"
            onClick={() => setAbierto(false)}
            aria-hidden
          />
          <span className="absolute z-50 left-1/2 -translate-x-1/2 top-6 w-56 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl text-left normal-case">
            <span className="block text-xs font-semibold text-neutral-100 mb-1">
              {def.titulo}
            </span>
            <span className="block text-xs text-neutral-400 leading-snug">
              {def.texto}
            </span>
          </span>
        </>
      )}
    </span>
  );
}
