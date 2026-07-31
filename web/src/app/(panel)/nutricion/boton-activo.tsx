"use client";

import { useTransition } from "react";
import { alternarActivoPlan } from "./acciones-extra";

export function BotonActivo({ id, activo }: { id: string; activo: boolean }) {
  const [pendiente, startTransition] = useTransition();

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        startTransition(async () => void (await alternarActivoPlan(id, !activo)));
      }}
      disabled={pendiente}
      className={
        "text-[10px] px-2 py-1 rounded-full border transition shrink-0 " +
        (activo
          ? "border-emerald-900 bg-emerald-950/40 text-emerald-300"
          : "border-neutral-700 text-neutral-500 hover:text-neutral-300")
      }
      title={
        activo
          ? "Activo: la clienta lo ve — clic para desactivar"
          : "Inactivo: oculto para la clienta — clic para activar"
      }
    >
      {pendiente ? "…" : activo ? "Activo" : "Inactivo"}
    </button>
  );
}
