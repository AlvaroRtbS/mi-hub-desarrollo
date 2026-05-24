"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: string;
  /** "sm" | "md" | "lg" — control de ancho máximo. */
  tamano?: "sm" | "md" | "lg";
  /** Si false, no se cierra al hacer click en el backdrop. */
  cerrarAlClickFondo?: boolean;
  children: React.ReactNode;
};

const ANCHOS = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

export function Modal({
  abierto,
  onCerrar,
  titulo,
  tamano = "md",
  cerrarAlClickFondo = true,
  children,
}: Props) {
  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [abierto, onCerrar]);

  // Bloquear scroll del body mientras esté abierto
  useEffect(() => {
    if (!abierto) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [abierto]);

  if (!abierto) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={cerrarAlClickFondo ? onCerrar : undefined}
      role="presentation"
    >
      <div
        className={
          "w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden " +
          ANCHOS[tamano]
        }
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        {titulo && (
          <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-neutral-800">
            <h2 className="text-base font-semibold">{titulo}</h2>
            <button
              onClick={onCerrar}
              className="text-neutral-500 hover:text-neutral-200 text-sm"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        )}
        <div className={titulo ? "p-5" : "p-6"}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

/** Modal de confirmación rápido (sustituye al confirm() nativo). */
export function ModalConfirmacion({
  abierto,
  onCerrar,
  onConfirmar,
  titulo = "¿Estás segura?",
  mensaje,
  textoBotonConfirmar = "Sí, continuar",
  textoBotonCancelar = "Cancelar",
  peligroso = false,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
  titulo?: string;
  mensaje: string;
  textoBotonConfirmar?: string;
  textoBotonCancelar?: string;
  peligroso?: boolean;
}) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo} tamano="sm">
      <p className="text-sm text-neutral-300 mb-4">{mensaje}</p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCerrar}
          className="text-sm px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
        >
          {textoBotonCancelar}
        </button>
        <button
          onClick={() => {
            onConfirmar();
            onCerrar();
          }}
          className={
            "text-sm px-3 py-1.5 rounded-lg font-medium " +
            (peligroso
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-brand-600 hover:bg-brand-700 text-white")
          }
        >
          {textoBotonConfirmar}
        </button>
      </div>
    </Modal>
  );
}
