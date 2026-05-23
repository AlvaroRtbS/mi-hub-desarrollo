"use client";

import { useState } from "react";

type Props = {
  contenido: React.ReactNode;
  /** "top" | "bottom" — dirección preferida del tooltip. */
  posicion?: "top" | "bottom";
  children: React.ReactElement;
};

/**
 * Tooltip simple en hover y focus. CSS-only (no portal), por simplicidad.
 * Para tooltips dentro de tablas/listas con overflow:hidden conviene poner
 * un wrapper sin overflow.
 */
export function Tooltip({ contenido, posicion = "top", children }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={
            "absolute z-50 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] " +
            "bg-neutral-800 text-neutral-100 border border-neutral-700 rounded px-2 py-1 shadow-lg " +
            (posicion === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5")
          }
        >
          {contenido}
        </span>
      )}
    </span>
  );
}
