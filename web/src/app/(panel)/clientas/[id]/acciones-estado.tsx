"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { cambiarEstadoClienta, eliminarClienta } from "../acciones";
import type { EstadoClienta } from "@/lib/supabase/tipos";

export function AccionesEstado({
  clientaId,
  estado,
}: {
  clientaId: string;
  estado: EstadoClienta;
}) {
  const router = useRouter();
  const [transicion, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cambiar(nuevoEstado: EstadoClienta) {
    setError(null);
    iniciarTransicion(async () => {
      const r = await cambiarEstadoClienta(clientaId, nuevoEstado);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function eliminar() {
    if (!confirm("¿Eliminar definitivamente esta clienta y todos sus datos?")) return;
    setError(null);
    iniciarTransicion(async () => {
      const r = await eliminarClienta(clientaId);
      // En caso de éxito la acción redirige (no retorna); si vuelve con error, mostrarlo.
      if (r && !r.ok) setError(r.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {estado === "archivada" ? (
          <Boton
            variante="secundario"
            disabled={transicion}
            onClick={() => cambiar("activa")}
          >
            Restaurar
          </Boton>
        ) : (
          <Boton
            variante="secundario"
            disabled={transicion}
            onClick={() => cambiar("archivada")}
          >
            Archivar
          </Boton>
        )}
        <Boton variante="peligro" disabled={transicion} onClick={eliminar}>
          Eliminar
        </Boton>
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
