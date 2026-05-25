"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye } from "lucide-react";

/**
 * Botón flotante "Vista clienta" — siempre visible cuando estás
 * navegando en el contexto de una clienta (su ficha, su plan, sus
 * fotos, sus mensajes, etc.). Lleva a /clientas/{id}/vista-clienta
 * para ver exactamente lo que ella ve en su app.
 *
 * Se auto-oculta:
 *  - Si la clienta no tiene cuenta activa (yaEnlazada=false).
 *  - Si ya estás en /vista-clienta (sería un link a la misma página).
 */
export function BotonVistaClienta({
  clientaId,
  yaEnlazada,
}: {
  clientaId: string;
  yaEnlazada: boolean;
}) {
  const pathname = usePathname() ?? "";
  if (!yaEnlazada) return null;
  if (pathname.includes(`/clientas/${clientaId}/vista-clienta`)) return null;

  return (
    <Link
      href={`/clientas/${clientaId}/vista-clienta`}
      title="Ver lo que la clienta ve en su app"
      className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 text-sm font-medium text-white rounded-full pl-4 pr-5 py-2.5 shadow-2xl border border-black/20 transition hover:scale-105"
      style={{ backgroundColor: "var(--brand)" }}
    >
      <Eye className="size-4" />
      Vista clienta
    </Link>
  );
}
