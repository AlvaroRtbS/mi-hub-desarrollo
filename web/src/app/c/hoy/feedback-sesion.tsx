"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarFeedbackSesion } from "./acciones";
import { useToast } from "@/components/ui/toast";

function Escala({
  valor,
  onChange,
  etiquetaMin,
  etiquetaMax,
}: {
  valor: string;
  onChange: (v: string) => void;
  etiquetaMin: string;
  etiquetaMax: string;
}) {
  return (
    <div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const sel = valor === String(n);
          return (
            <button
              type="button"
              key={n}
              onClick={() => onChange(String(n))}
              className={
                "flex-1 h-9 rounded-lg border text-sm font-semibold transition " +
                (sel
                  ? "text-white border-transparent"
                  : "border-neutral-800 text-neutral-300 hover:bg-neutral-900")
              }
              style={sel ? { backgroundColor: "var(--brand)" } : undefined}
              aria-pressed={sel}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
        <span>{etiquetaMin}</span>
        <span>{etiquetaMax}</span>
      </div>
    </div>
  );
}

export function FeedbackSesion({
  fecha,
  inicial,
}: {
  fecha: string;
  inicial: {
    esfuerzo?: string | null;
    energia?: string | null;
    comentario?: string | null;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [esfuerzo, setEsfuerzo] = useState(inicial.esfuerzo ?? "");
  const [energia, setEnergia] = useState(inicial.energia ?? "");
  const [comentario, setComentario] = useState(inicial.comentario ?? "");
  const yaTenia = !!(inicial.esfuerzo || inicial.energia || inicial.comentario);
  const [enviando, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
      const r = await guardarFeedbackSesion(fecha, {
        esfuerzo,
        energia,
        comentario,
      });
      if (r.ok) {
        toast.success("¡Gracias por tu feedback! 💬");
        router.refresh();
      } else {
        toast.error?.(r.error);
      }
    });
  }

  return (
    <div className="mt-3 border border-neutral-800 rounded-2xl p-4 bg-neutral-900/30 space-y-3">
      <div className="text-sm font-medium">¿Cómo te has sentido hoy?</div>
      <div>
        <div className="text-xs text-neutral-400 mb-1">Esfuerzo del entreno</div>
        <Escala
          valor={esfuerzo}
          onChange={setEsfuerzo}
          etiquetaMin="Suave"
          etiquetaMax="Muy duro"
        />
      </div>
      <div>
        <div className="text-xs text-neutral-400 mb-1">Tu energía</div>
        <Escala
          valor={energia}
          onChange={setEnergia}
          etiquetaMin="Baja"
          etiquetaMax="Alta"
        />
      </div>
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="¿Algo que contarme del entreno? (opcional)"
        rows={2}
        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-y"
      />
      <button
        type="button"
        onClick={guardar}
        disabled={enviando}
        className="w-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-100 rounded-lg py-2 text-sm font-medium border border-neutral-700"
      >
        {enviando ? "Guardando…" : yaTenia ? "Actualizar feedback" : "Enviar feedback"}
      </button>
    </div>
  );
}
