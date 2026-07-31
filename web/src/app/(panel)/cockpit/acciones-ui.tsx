"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { encolarJob } from "./acciones";

/** Refresca la página cada 30 s para ver latido y jobs sin recargar a mano. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}

export function BotonJob({
  tipo,
  payload,
  etiqueta,
  descripcion,
}: {
  tipo: string;
  payload?: Record<string, unknown>;
  etiqueta: string;
  descripcion: string;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function lanzar() {
    setError(null);
    startTransition(async () => {
      const r = await encolarJob(tipo, payload ?? {});
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col gap-2">
      <div className="text-sm font-medium text-neutral-100">{etiqueta}</div>
      <div className="text-xs text-neutral-500 flex-1">{descripcion}</div>
      <button
        onClick={lanzar}
        disabled={pendiente}
        className="mt-1 self-start text-xs px-3 py-1.5 rounded-lg font-medium text-white transition disabled:opacity-50"
        style={{ backgroundColor: "var(--brand)" }}
      >
        {pendiente ? "Encolando…" : "Lanzar"}
      </button>
      {error && <div className="text-xs text-amber-400">{error}</div>}
    </div>
  );
}
