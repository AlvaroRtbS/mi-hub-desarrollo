"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { guardarComentarioCoach } from "./acciones-comentario";

export function ComentarioCoachInput({
  sesionId,
  clientaId,
  inicial,
}: {
  sesionId: string;
  clientaId: string;
  inicial: string | null;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(inicial ?? "");
  const [guardando, start] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cambiado = texto.trim() !== (inicial ?? "").trim();

  function guardar() {
    setError(null);
    start(async () => {
      const r = await guardarComentarioCoach(sesionId, clientaId, texto);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOk(true);
      setTimeout(() => setOk(false), 2000);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex gap-2 items-stretch">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          placeholder="Tu mensaje para ella…"
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-none"
        />
        <button
          onClick={guardar}
          disabled={guardando || !cambiado}
          className="px-3 text-xs font-medium text-white rounded-lg disabled:opacity-40"
          style={{ backgroundColor: "var(--brand)" }}
        >
          {ok ? <Check className="size-4" /> : guardando ? "…" : "Enviar"}
        </button>
      </div>
      {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
    </div>
  );
}
