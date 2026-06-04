"use client";

import { useEffect, useRef } from "react";

/**
 * Marca una conversación como leída DESPUÉS de montar, no durante el render del
 * Server Component (donde estaba antes: un efecto secundario —un UPDATE— dentro
 * de un GET). Recibe una server action ya enlazada con sus argumentos.
 */
export function MarcarLeidoAlMontar({
  accion,
}: {
  accion: () => Promise<void>;
}) {
  const hecho = useRef(false);
  useEffect(() => {
    if (hecho.current) return;
    hecho.current = true;
    void accion().catch(() => {
      /* silencioso: marcar leído no es crítico */
    });
  }, [accion]);
  return null;
}
