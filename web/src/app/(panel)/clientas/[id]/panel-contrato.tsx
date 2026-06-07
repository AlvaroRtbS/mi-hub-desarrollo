"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { enviarContrato, marcarContratoFirmado } from "./contrato-acciones";

export type EstadoContrato = "firmado" | "pendiente" | "rechazado" | null;

const META: Record<
  "firmado" | "pendiente" | "rechazado" | "sin_enviar",
  { etiqueta: string; clase: string; icono: string }
> = {
  firmado: { etiqueta: "Firmado", clase: "bg-green-500/15 text-green-400 border-green-500/30", icono: "✅" },
  pendiente: { etiqueta: "Pendiente de firma", clase: "bg-amber-500/15 text-amber-400 border-amber-500/30", icono: "⏳" },
  rechazado: { etiqueta: "Rechazado", clase: "bg-red-500/15 text-red-400 border-red-500/30", icono: "✖️" },
  sin_enviar: { etiqueta: "Sin enviar", clase: "bg-neutral-700/30 text-neutral-400 border-neutral-700", icono: "—" },
};

export function PanelContrato({
  clientaId,
  estado,
}: {
  clientaId: string;
  estado: EstadoContrato;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const clave = estado ?? "sin_enviar";
  const meta = META[clave];
  const firmado = estado === "firmado";

  function enviar() {
    setError(null);
    setAviso(null);
    iniciar(async () => {
      const r = await enviarContrato(clientaId);
      if (!r.ok) setError(r.error);
      else {
        setAviso("Contrato enviado por el chat.");
        router.refresh();
      }
    });
  }

  function marcar() {
    if (
      !confirm(
        "¿Marcar el contrato como firmado a mano?\n\nÚsalo solo si la clienta lo firmó por otra vía (papel u otro email que no casó con su ficha)."
      )
    )
      return;
    setError(null);
    setAviso(null);
    iniciar(async () => {
      const r = await marcarContratoFirmado(clientaId);
      if (!r.ok) setError(r.error);
      else {
        setAviso("Marcado como firmado.");
        router.refresh();
      }
    });
  }

  return (
    <div className="border border-neutral-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">📄 Contrato de servicios</h3>
        <span
          className={`text-[11px] font-medium px-2 py-1 rounded-full border ${meta.clase}`}
        >
          {meta.icono} {meta.etiqueta}
        </span>
      </div>

      <p className="text-sm text-neutral-400 mb-4">
        {firmado
          ? "La clienta ha firmado el contrato. Ya puedes activarla y empezar."
          : "La clienta debe firmar el contrato antes de activarla. Envíaselo por el chat; se marcará como firmado automáticamente cuando lo envíe con el email de su ficha."}
      </p>

      <div className="flex flex-wrap gap-2">
        <Boton variante="secundario" tamano="sm" disabled={pendiente} onClick={enviar}>
          {firmado ? "Reenviar contrato" : "Enviar contrato"}
        </Boton>
        {!firmado && (
          <Boton variante="fantasma" tamano="sm" disabled={pendiente} onClick={marcar}>
            Marcar firmado a mano
          </Boton>
        )}
      </div>

      {aviso && <p className="text-xs text-green-400 mt-2">{aviso}</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
