"use client";

import { useEffect } from "react";
import { Boton } from "@/components/ui/boton";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción esto podría reportarse a un sistema de telemetría
    console.error("Panel error:", error);
  }, [error]);

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="border border-red-900/50 bg-red-950/30 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-lg font-semibold mb-2">Algo no salió bien</h2>
        <p className="text-sm text-neutral-400 mb-1">
          La página no se ha podido cargar. Vuelve a intentarlo.
        </p>
        {error.digest && (
          <p className="text-[10px] text-neutral-600 font-mono mb-4">
            ref: {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center mt-5">
          <Boton onClick={reset}>Reintentar</Boton>
          <Boton variante="secundario" href="/inicio">
            Ir al inicio
          </Boton>
        </div>
      </div>
    </div>
  );
}
