"use client";

import { useTransition } from "react";
import { alternarPublicadaReceta } from "../acciones-extra";

export function BotonPublicada({ id, publicada }: { id: string; publicada: boolean }) {
  const [pendiente, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(async () => void (await alternarPublicadaReceta(id, !publicada)))}
      disabled={pendiente}
      className={
        "text-xs px-3 py-1.5 rounded-full border transition shrink-0 " +
        (publicada
          ? "border-emerald-900 bg-emerald-950/40 text-emerald-300"
          : "border-neutral-700 text-neutral-500 hover:text-neutral-300")
      }
      title={publicada ? "Visible para clientas — clic para ocultar" : "Oculta — clic para publicar"}
    >
      {pendiente ? "…" : publicada ? "Publicada" : "Oculta"}
    </button>
  );
}
