"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Copia al portapapeles un borrador de mensaje de rescate para la clienta.
export function BotonCopiarMensaje({ nombre }: { nombre: string }) {
  const [copiado, setCopiado] = useState(false);

  const mensaje =
    `¡Hola ${nombre}! 💜 Llevo unos días viendo que no has podido entrenar ` +
    `y quería preguntarte: ¿cómo estás? No te escribo para regañarte, sino ` +
    `para ajustar lo que haga falta — si la semana viene complicada, ` +
    `adaptamos el plan y listo. Cuéntame qué tal 🙂`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el coach puede copiarlo de WhatsApp Web
    }
  }

  return (
    <button
      onClick={copiar}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-900 hover:text-white transition"
      title="Copiar borrador de mensaje de rescate"
    >
      {copiado ? <Check size={13} /> : <Copy size={13} />}
      {copiado ? "Copiado" : "Mensaje"}
    </button>
  );
}
