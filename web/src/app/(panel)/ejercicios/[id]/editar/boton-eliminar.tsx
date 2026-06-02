"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/boton";
import { eliminarEjercicio } from "../../acciones";

export function BotonEliminar({ ejercicioId }: { ejercicioId: string }) {
  const [transicion, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function eliminar() {
    if (!confirm("¿Eliminar este ejercicio definitivamente?")) return;
    setError(null);
    iniciarTransicion(async () => {
      const r = await eliminarEjercicio(ejercicioId);
      // En caso de éxito la acción redirige (no retorna); si vuelve con error, mostrarlo.
      if (r && !r.ok) setError(r.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Boton variante="peligro" disabled={transicion} onClick={eliminar}>
        Eliminar
      </Boton>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
